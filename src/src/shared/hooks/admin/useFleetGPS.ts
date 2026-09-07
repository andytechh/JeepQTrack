import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "../../config/supabase";

import {
  getOutsideHoursMessage,
  isWithinOperatingHours,
} from "../../utils/operatingHours";

export type FleetStatus =
  "en_route" | "waiting" | "loading" | "arrived" | "offline";

export interface FleetJeepney {
  id: string;

  plateNumber: string;

  driverName: string;

  status: FleetStatus;

  lat: number;

  lng: number;

  speed: number;

  /*
   * LIVE PASSENGER COUNT
   *
   * This comes from:
   *
   * front_count + rear_count
   *
   * in door_counts.
   */
  occupancy: number;

  capacity: number;

  terminalId: number;

  recordedAt: string | null;

  /*
   * GPS/location availability.
   *
   * IMPORTANT:
   * This is NOT based on a 2-minute movement timeout anymore.
   *
   * A stationary jeepney remains online.
   */
  isOnline: boolean;

  /*
   * Whether the most recent GPS record is recent.
   *
   * This is informational only.
   *
   * It does NOT remove the jeepney from the map.
   */
  gpsFresh: boolean;

  /*
   * Whether the jeepney is currently within
   * the 5 AM - 9 PM service window.
   */
  isServiceActive: boolean;

  /*
   * Last door-count update.
   */
  occupancyUpdatedAt: string | null;
}

interface DoorCountRow {
  id: string;

  jeep_id: string | null;

  front_count: number | null;

  rear_count: number | null;

  updated_at: string | null;
}

/*
 * GPS freshness is now informational.
 *
 * We DO NOT use this to remove a jeepney from the map.
 */
const GPS_FRESH_THRESHOLD_MS = 2 * 60 * 1000;

/*
 * Determine whether a database jeepney status is active
 * for fleet monitoring.
 */
function isActiveJeepneyStatus(status: unknown) {
  const value = String(status ?? "").toLowerCase();

  return (
    value === "waiting" ||
    value === "loading" ||
    value === "en_route" ||
    value === "dispatched"
  );
}

function normalizeStatus(status: unknown): FleetStatus {
  const value = String(status ?? "").toLowerCase();

  switch (value) {
    case "waiting":
      return "waiting";

    case "loading":
      return "loading";

    case "arrived":
      return "arrived";

    case "en_route":
    case "enroute":
    case "moving":
    case "dispatched":
      return "en_route";

    default:
      return "offline";
  }
}

function isGPSFresh(recordedAt: string | null) {
  if (!recordedAt) {
    return false;
  }

  const timestamp = new Date(recordedAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= GPS_FRESH_THRESHOLD_MS;
}

/*
 * Calculate the actual passenger count from the
 * door counter.
 */
function getDoorCountTotal(row: Partial<DoorCountRow> | null | undefined) {
  if (!row) {
    return null;
  }

  const front = Number(row.front_count ?? 0);

  const rear = Number(row.rear_count ?? 0);

  return Math.max(0, front + rear);
}

export function useFleetGPS() {
  const [fleet, setFleet] = useState<FleetJeepney[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const [isServiceActive, setIsServiceActive] = useState(() =>
    isWithinOperatingHours(),
  );

  const channelRef = useRef<any>(null);

  /*
   * ------------------------------------------------------------
   * LOAD LATEST DOOR COUNTS
   * ------------------------------------------------------------
   */
  const loadDoorCounts = useCallback(async (jeepneyIds: string[]) => {
    const result = new Map<string, DoorCountRow>();

    if (jeepneyIds.length === 0) {
      return result;
    }

    const { data, error: doorError } = await supabase
      .from("door_counts")
      .select(
        `
            id,
            jeep_id,
            front_count,
            rear_count,
            updated_at
          `,
      )
      .in("jeep_id", jeepneyIds)
      .order("updated_at", {
        ascending: false,
      });

    if (doorError) {
      console.error("❌ Fleet door count error:", doorError);

      return result;
    }

    /*
     * Because the rows are newest first,
     * the first row for each jeepney is the
     * latest door-count state.
     */
    data?.forEach((row: DoorCountRow) => {
      if (!row.jeep_id) {
        return;
      }

      if (!result.has(row.jeep_id)) {
        result.set(row.jeep_id, row);
      }
    });

    return result;
  }, []);

  /*
   * ------------------------------------------------------------
   * LOAD FLEET
   * ------------------------------------------------------------
   */
  const loadFleet = useCallback(async () => {
    try {
      setError(null);

      const serviceActive = isWithinOperatingHours();

      setIsServiceActive(serviceActive);

      /*
       * Get jeepney metadata.
       */
      const { data: jeepneys, error: jeepneyError } = await supabase
        .from("jeepneys")
        .select(
          `
              id,
              plate_number,
              status,
              current_occupancy,
              capacity,
              driver_name,
              terminal_id
            `,
        )
        .order("plate_number", {
          ascending: true,
        });

      if (jeepneyError) {
        console.error("❌ Fleet jeepney error:", jeepneyError);

        setError("Unable to load fleet information.");

        return;
      }

      const jeepneyIds = (jeepneys ?? [])
        .map((item: any) => String(item.id))
        .filter(Boolean);

      /*
       * Get latest GPS records.
       */
      const { data: gpsRecords, error: gpsError } = await supabase
        .from("latest_gps_tracking")
        .select(
          `
              jeepney_id,
              latitude,
              longitude,
              speed,
              recorded_at
            `,
        )
        .order("recorded_at", {
          ascending: false,
        });

      if (gpsError) {
        console.error("❌ Fleet GPS error:", gpsError);

        setError("Unable to load live GPS information.");

        return;
      }

      /*
       * Latest GPS per jeepney.
       */
      const latestGPS = new Map<string, any>();

      gpsRecords?.forEach((record: any) => {
        if (!record.jeepney_id) {
          return;
        }

        if (latestGPS.has(record.jeepney_id)) {
          return;
        }

        latestGPS.set(record.jeepney_id, record);
      });

      /*
       * Latest door counts per jeepney.
       */
      const latestDoorCounts = await loadDoorCounts(jeepneyIds);

      /*
       * Build fleet.
       */
      const result: FleetJeepney[] = [];

      jeepneys?.forEach((jeepney: any) => {
        const jeepneyId = String(jeepney.id);

        const gps = latestGPS.get(jeepneyId);

        const doorCount = latestDoorCounts.get(jeepneyId);

        const lat = Number(gps?.latitude);

        const lng = Number(gps?.longitude);

        const speed = Number(gps?.speed ?? 0);

        const recordedAt = gps?.recorded_at ?? null;

        const hasValidLocation =
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat !== 0 &&
          lng !== 0;

        const gpsFresh = isGPSFresh(recordedAt);

        const activeStatus = isActiveJeepneyStatus(jeepney.status);

        /*
         * DIRECT DOOR COUNT
         *
         * front_count + rear_count
         *
         * Fallback to jeepneys.current_occupancy only
         * when no door-count row exists.
         */
        const doorTotal = getDoorCountTotal(doorCount);

        const occupancy =
          doorTotal !== null
            ? doorTotal
            : Math.max(0, Number(jeepney.current_occupancy ?? 0));

        /*
         * IMPORTANT:
         *
         * isOnline does NOT use gpsFresh.
         *
         * A jeepney that is stationary for 5, 10, or
         * 20 minutes does NOT disappear.
         *
         * It only needs:
         *
         * 1. valid GPS location
         * 2. active service status
         * 3. service hours
         */
        const visibleOnMap = serviceActive && activeStatus && hasValidLocation;

        result.push({
          id: jeepneyId,

          plateNumber: jeepney.plate_number ?? "Unknown",

          driverName: jeepney.driver_name ?? "Unassigned",

          status:
            serviceActive && activeStatus
              ? normalizeStatus(jeepney.status)
              : "offline",

          lat: hasValidLocation ? lat : 0,

          lng: hasValidLocation ? lng : 0,

          speed: Number.isFinite(speed) ? speed : 0,

          occupancy,

          capacity: Math.max(1, Number(jeepney.capacity ?? 24)),

          terminalId: Number(jeepney.terminal_id) === 2 ? 2 : 1,

          recordedAt,

          /*
           * This controls map visibility.
           *
           * No movement timeout.
           */
          isOnline: visibleOnMap,

          /*
           * Informational GPS freshness.
           */
          gpsFresh,

          isServiceActive: serviceActive,

          occupancyUpdatedAt: doorCount?.updated_at ?? null,
        });
      });

      setFleet(result);

      /*
       * Newest GPS update.
       */
      const timestamps = result
        .map((item) => item.recordedAt)
        .filter(Boolean)
        .map((item) => new Date(item as string).getTime())
        .filter(Number.isFinite);

      if (timestamps.length > 0) {
        const newest = Math.max(...timestamps);

        setLastUpdate(new Date(newest).toISOString());
      }
    } catch (err) {
      console.error("❌ Fleet GPS exception:", err);

      setError("Unable to load fleet monitoring data.");
    } finally {
      setLoading(false);
    }
  }, [loadDoorCounts]);

  /*
   * ------------------------------------------------------------
   * REFRESH
   * ------------------------------------------------------------
   */
  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);

      await loadFleet();
    } finally {
      setRefreshing(false);
    }
  }, [loadFleet]);

  /*
   * ------------------------------------------------------------
   * INITIAL LOAD + REALTIME
   * ------------------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    void loadFleet();

    const channelName = `admin-fleet-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    console.log("📡 Starting fleet realtime:", channelName);

    const channel = supabase
      .channel(channelName)

      /*
       * ========================================================
       * GPS INSERT
       * ========================================================
       */
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
        },
        (payload) => {
          if (cancelled) {
            return;
          }

          const gps = payload.new as any;

          const jeepneyId = String(gps.jeepney_id);

          const lat = Number(gps.latitude);

          const lng = Number(gps.longitude);

          const speed = Number(gps.speed ?? 0);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return;
          }

          /*
           * New GPS means the vehicle is now located here.
           *
           * It does NOT change passenger count.
           */
          setFleet((current) =>
            current.map((item) => {
              if (item.id !== jeepneyId) {
                return item;
              }

              return {
                ...item,

                lat,

                lng,

                speed: Number.isFinite(speed) ? speed : item.speed,

                recordedAt: gps.recorded_at ?? item.recordedAt,

                /*
                 * New location received.
                 *
                 * Keep online as long as service is active.
                 */
                isOnline: item.isServiceActive,

                gpsFresh: true,
              };
            }),
          );

          setLastUpdate(gps.recorded_at ?? new Date().toISOString());
        },
      )

      /*
       * ========================================================
       * JEEPNEY UPDATE
       * ========================================================
       */
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          if (cancelled) {
            return;
          }

          const jeepney = payload.new as any;

          const jeepneyId = String(jeepney.id);

          console.log("🚐 ADMIN JEEPNEY UPDATE:", jeepneyId);

          setFleet((current) =>
            current.map((item) => {
              if (item.id !== jeepneyId) {
                return item;
              }

              const activeStatus = isActiveJeepneyStatus(jeepney.status);

              const serviceActive = isWithinOperatingHours();

              return {
                ...item,

                plateNumber: jeepney.plate_number ?? item.plateNumber,

                driverName: jeepney.driver_name ?? item.driverName,

                status:
                  serviceActive && activeStatus
                    ? normalizeStatus(jeepney.status)
                    : "offline",

                /*
                 * IMPORTANT:
                 *
                 * Do not use jeepneys.current_occupancy
                 * as the primary live passenger source.
                 *
                 * Door counts handle occupancy.
                 */
                occupancy: item.occupancy,

                capacity: Math.max(
                  1,
                  Number(jeepney.capacity ?? item.capacity ?? 24),
                ),

                terminalId:
                  Number(jeepney.terminal_id ?? item.terminalId ?? 1) === 2
                    ? 2
                    : 1,

                isServiceActive: serviceActive,

                isOnline:
                  serviceActive &&
                  activeStatus &&
                  item.lat !== 0 &&
                  item.lng !== 0,
              };
            }),
          );
        },
      )

      /*
       * ========================================================
       * DOOR COUNT INSERT
       * ========================================================
       */
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "door_counts",
        },
        (payload) => {
          if (cancelled) {
            return;
          }

          const door = payload.new as DoorCountRow;

          if (!door.jeep_id) {
            return;
          }

          const total = getDoorCountTotal(door);

          if (total === null) {
            return;
          }

          console.log("🚪 FLEET DOOR COUNT INSERT:", {
            jeepneyId: door.jeep_id,
            front: door.front_count,
            rear: door.rear_count,
            total,
          });

          setFleet((current) =>
            current.map((item) =>
              item.id === door.jeep_id
                ? {
                    ...item,

                    /*
                     * DIRECT LIVE COUNT
                     */
                    occupancy: total,

                    occupancyUpdatedAt:
                      door.updated_at ?? new Date().toISOString(),
                  }
                : item,
            ),
          );
        },
      )

      /*
       * ========================================================
       * DOOR COUNT UPDATE
       * ========================================================
       *
       * This is the important event for:
       *
       * 15 -> 14
       * 14 -> 13
       * 13 -> 15
       *
       * etc.
       */
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "door_counts",
        },
        (payload) => {
          if (cancelled) {
            return;
          }

          const door = payload.new as DoorCountRow;

          if (!door.jeep_id) {
            return;
          }

          const total = getDoorCountTotal(door);

          if (total === null) {
            return;
          }

          console.log("🚪 FLEET DOOR COUNT UPDATE:", {
            jeepneyId: door.jeep_id,
            front: door.front_count,
            rear: door.rear_count,
            total,
          });

          setFleet((current) =>
            current.map((item) =>
              item.id === door.jeep_id
                ? {
                    ...item,

                    /*
                     * THIS DIRECTLY UPDATES
                     * THE SELECTED CARD AND
                     * FLEET LIST.
                     */
                    occupancy: total,

                    occupancyUpdatedAt:
                      door.updated_at ?? new Date().toISOString(),
                  }
                : item,
            ),
          );
        },
      )

      /*
       * ========================================================
       * JEEPNEY DELETE
       * ========================================================
       */
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          if (cancelled) {
            return;
          }

          const deleted = payload.old as any;

          if (!deleted.id) {
            return;
          }

          setFleet((current) =>
            current.filter((item) => item.id !== String(deleted.id)),
          );
        },
      )

      .subscribe((status, err) => {
        if (cancelled) {
          return;
        }

        console.log("📡 Admin fleet realtime:", status);

        if (status === "SUBSCRIBED") {
          console.log("✅ Admin fleet realtime connected");
        }

        if (status === "CHANNEL_ERROR") {
          console.error("❌ Admin fleet realtime channel error:", err);
        }

        if (status === "TIMED_OUT") {
          console.error("⏱️ Admin fleet realtime timed out:", err);
        }
      });

    channelRef.current = channel;

    return () => {
      cancelled = true;

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      console.log("📡 Removing fleet realtime:", channelName);

      void supabase.removeChannel(channel);
    };
  }, [loadFleet]);

  /*
   * ------------------------------------------------------------
   * SERVICE HOURS
   * ------------------------------------------------------------
   *
   * Re-check every minute.
   *
   * This changes the UI only.
   * It does NOT modify the database.
   */
  useEffect(() => {
    const checkServiceHours = () => {
      const active = isWithinOperatingHours();

      setIsServiceActive(active);

      setFleet((current) =>
        current.map((item) => ({
          ...item,

          isServiceActive: active,

          /*
           * Outside service hours,
           * remove live map visibility.
           *
           * Database status is untouched.
           */
          isOnline:
            active &&
            isActiveJeepneyStatus(item.status) &&
            item.lat !== 0 &&
            item.lng !== 0,

          status: active ? item.status : "offline",
        })),
      );
    };

    checkServiceHours();

    const interval = setInterval(checkServiceHours, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  /*
   * ------------------------------------------------------------
   * GPS FRESHNESS
   * ------------------------------------------------------------
   *
   * We still update gpsFresh for informational purposes.
   *
   * BUT we NEVER change isOnline because of this.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setFleet((current) =>
        current.map((item) => ({
          ...item,

          gpsFresh: isGPSFresh(item.recordedAt),

          /*
           * Do NOT turn this false merely
           * because GPS is old.
           */
          isOnline:
            item.isServiceActive &&
            isActiveJeepneyStatus(item.status) &&
            item.lat !== 0 &&
            item.lng !== 0,
        })),
      );
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  /*
   * ------------------------------------------------------------
   * RETURN
   * ------------------------------------------------------------
   */
  return {
    fleet,

    loading,

    refreshing,

    error,

    lastUpdate,

    refresh,

    isServiceActive,

    operatingHoursMessage: getOutsideHoursMessage(),

    onlineCount: fleet.filter((item) => item.isOnline).length,

    movingCount: fleet.filter((item) => item.isOnline && item.speed > 2).length,

    waitingCount: fleet.filter(
      (item) => item.isOnline && item.status === "waiting",
    ).length,

    offlineCount: fleet.filter((item) => !item.isOnline).length,

    passengerCount: fleet.reduce((total, item) => total + item.occupancy, 0),
  };
}
