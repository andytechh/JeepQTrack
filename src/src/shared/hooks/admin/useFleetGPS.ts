import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "../../config/supabase";

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

  occupancy: number;

  capacity: number;

  terminalId: number;

  recordedAt: string | null;

  isOnline: boolean;
}

const GPS_OFFLINE_THRESHOLD_MS = 2 * 60 * 1000;

/* ============================================================
   HELPERS
============================================================ */

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
      return "en_route";

    default:
      return "en_route";
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

  return Date.now() - timestamp <= GPS_OFFLINE_THRESHOLD_MS;
}

/* ============================================================
   HOOK
============================================================ */

export function useFleetGPS() {
  const [fleet, setFleet] = useState<FleetJeepney[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const channelRef = useRef<any>(null);

  /* ==========================================================
     LOAD FLEET
  ========================================================== */

  const loadFleet = useCallback(async () => {
    try {
      setError(null);

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
       * Keep only the newest GPS record per jeepney.
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
       * Build fleet list.
       */
      const result: FleetJeepney[] = [];

      jeepneys?.forEach((jeepney: any) => {
        const gps = latestGPS.get(jeepney.id);

        const lat = Number(gps?.latitude);

        const lng = Number(gps?.longitude);

        const speed = Number(gps?.speed ?? 0);

        const recordedAt = gps?.recorded_at ?? null;

        const hasValidLocation = Number.isFinite(lat) && Number.isFinite(lng);

        const fresh = isGPSFresh(recordedAt);

        /*
         * If there is no valid GPS location,
         * still include the jeepney in the admin fleet.
         */
        result.push({
          id: String(jeepney.id),

          plateNumber: jeepney.plate_number ?? "Unknown",

          driverName: jeepney.driver_name ?? "Unassigned",

          status: fresh ? normalizeStatus(jeepney.status) : "offline",

          lat: hasValidLocation ? lat : 0,

          lng: hasValidLocation ? lng : 0,

          speed: Number.isFinite(speed) ? speed : 0,

          occupancy: Number(jeepney.current_occupancy ?? 0),

          capacity: Number(jeepney.capacity ?? 24),

          terminalId: Number(jeepney.terminal_id) === 2 ? 2 : 1,

          recordedAt,

          isOnline: fresh && hasValidLocation,
        });
      });

      setFleet(result);

      /*
       * Determine newest GPS update.
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
  }, []);

  /* ==========================================================
     REFRESH
  ========================================================== */

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);

      await loadFleet();
    } finally {
      setRefreshing(false);
    }
  }, [loadFleet]);

  /* ==========================================================
     INITIAL LOAD + REALTIME
  ========================================================== */

  useEffect(() => {
    loadFleet();

    const channelName = `admin-fleet-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    const channel = supabase
      .channel(channelName)

      /* ======================================================
         GPS INSERT
      ====================================================== */

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
        },
        async (payload) => {
          const gps = payload.new as any;

          console.log(
            "📍 ADMIN FLEET GPS:",
            gps.jeepney_id,
            gps.latitude,
            gps.longitude,
            gps.speed,
          );

          const jeepneyId = String(gps.jeepney_id);

          const lat = Number(gps.latitude);

          const lng = Number(gps.longitude);

          const speed = Number(gps.speed ?? 0);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return;
          }

          setFleet((current) => {
            const exists = current.some((item) => item.id === jeepneyId);

            /*
             * If admin opened the screen before this jeepney
             * appeared in the fleet, reload metadata.
             */
            if (!exists) {
              loadFleet();

              return current;
            }

            return current.map((item) => {
              if (item.id !== jeepneyId) {
                return item;
              }

              return {
                ...item,

                lat,

                lng,

                speed: Number.isFinite(speed) ? speed : 0,

                recordedAt: gps.recorded_at ?? item.recordedAt,

                isOnline: true,

                status: item.status === "offline" ? "en_route" : item.status,
              };
            });
          });

          setLastUpdate(gps.recorded_at ?? new Date().toISOString());
        },
      )

      /* ======================================================
         JEEPNEY UPDATE
      ====================================================== */

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          const jeepney = payload.new as any;

          const jeepneyId = String(jeepney.id);

          console.log("🚐 ADMIN JEEPNEY UPDATE:", jeepneyId);

          setFleet((current) =>
            current.map((item) => {
              if (item.id !== jeepneyId) {
                return item;
              }

              return {
                ...item,

                plateNumber: jeepney.plate_number ?? item.plateNumber,

                driverName: jeepney.driver_name ?? item.driverName,

                status: item.isOnline
                  ? normalizeStatus(jeepney.status)
                  : "offline",

                occupancy: Number(
                  jeepney.current_occupancy ?? item.occupancy ?? 0,
                ),

                capacity: Number(jeepney.capacity ?? item.capacity ?? 24),

                terminalId:
                  Number(jeepney.terminal_id ?? item.terminalId ?? 1) === 2
                    ? 2
                    : 1,
              };
            }),
          );
        },
      )

      .subscribe((status) => {
        console.log("📡 Admin fleet realtime:", status);
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();

      channelRef.current = null;
    };
  }, [loadFleet]);

  /* ==========================================================
     OFFLINE CHECK
     
     GPS can become stale without another INSERT.
     Periodically mark old locations offline.
  ========================================================== */

  useEffect(() => {
    const interval = setInterval(() => {
      setFleet((current) =>
        current.map((item) => {
          if (!item.recordedAt) {
            return {
              ...item,
              isOnline: false,
              status: "offline",
            };
          }

          const fresh = isGPSFresh(item.recordedAt);

          if (!fresh && item.isOnline) {
            return {
              ...item,
              isOnline: false,
              status: "offline",
            };
          }

          return item;
        }),
      );
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  /* ==========================================================
     RETURN
  ========================================================== */

  return {
    fleet,

    loading,

    refreshing,

    error,

    lastUpdate,

    refresh,

    onlineCount: fleet.filter((item) => item.isOnline).length,

    movingCount: fleet.filter((item) => item.isOnline && item.speed > 2).length,

    waitingCount: fleet.filter(
      (item) => item.isOnline && item.status === "waiting",
    ).length,

    offlineCount: fleet.filter((item) => !item.isOnline).length,

    passengerCount: fleet.reduce((total, item) => total + item.occupancy, 0),
  };
}
