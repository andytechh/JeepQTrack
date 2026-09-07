import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../config/supabase";
import {
  getOutsideHoursMessage,
  isWithinOperatingHours,
} from "../../utils/operatingHours";

export type JeepneyStatus =
  "waiting" | "loading" | "en_route" | "arrived" | "dispatched" | "inactive";

export interface AdminJeepney {
  id: string;
  plate_number: string;
  jeep_name: string | null;
  driver_name: string | null;
  driver_id: string | null;

  bracket: number;
  capacity: number;

  current_occupancy: number;
  last_occupancy_update: string | null;

  status: JeepneyStatus;

  queue_position: number | null;

  departure_time: string | null;
  eta: number | null;

  current_latitude: number | null;
  current_longitude: number | null;

  terminal_id: number;

  loading_ends_at: string | null;

  created_at: string;
  updated_at: string;

  /*
   * Timestamp of this jeepney's most recent GPS ping.
   * Informational only.
   */
  last_gps_at: string | null;
}

export interface AdminDashboardStats {
  total: number;
  active: number;
  waiting: number;
  loading: number;
  enRoute: number;
  arrived: number;
  dispatched: number;
  inactive: number;
}

export interface AdminDashboardResult {
  jeepneys: AdminJeepney[];

  waitingJeepneys: AdminJeepney[];

  loadingJeepney: AdminJeepney | null;

  enRouteJeepneys: AdminJeepney[];

  stats: AdminDashboardStats;

  refreshing: boolean;

  loading: boolean;

  error: string | null;

  refresh: () => Promise<void>;

  isOperatingHours: boolean;

  operatingHoursMessage: string;
}

interface DoorCountRow {
  id: string;
  jeep_id: string | null;
  front_count: number | null;
  rear_count: number | null;
  updated_at: string | null;
}

const EMPTY_STATS: AdminDashboardStats = {
  total: 0,
  active: 0,
  waiting: 0,
  loading: 0,
  enRoute: 0,
  arrived: 0,
  dispatched: 0,
  inactive: 0,
};

const SELECT_COLUMNS = `
  id,
  plate_number,
  jeep_name,
  driver_name,
  driver_id,
  bracket,
  capacity,
  current_occupancy,
  last_occupancy_update,
  status,
  queue_position,
  departure_time,
  eta,
  current_latitude,
  current_longitude,
  terminal_id,
  loading_ends_at,
  created_at,
  updated_at
`;

export function useAdminDashboard(): AdminDashboardResult {
  const [jeepneys, setJeepneys] = useState<AdminJeepney[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [isOperatingHours, setIsOperatingHours] = useState(() =>
    isWithinOperatingHours(),
  );

  const [operatingHoursMessage, setOperatingHoursMessage] = useState(() =>
    getOutsideHoursMessage(),
  );

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /*
   * Fetch the latest door count row for every jeepney.
   *
   * door_counts can contain multiple rows for the same jeepney,
   * so we order newest first and keep only the first row per jeepney.
   */
  const loadDoorCounts = useCallback(async (jeepneyIds: string[]) => {
    if (jeepneyIds.length === 0) {
      return new Map<string, DoorCountRow>();
    }

    const { data, error: doorCountError } = await supabase
      .from("door_counts")
      .select("id, jeep_id, front_count, rear_count, updated_at")
      .in("jeep_id", jeepneyIds)
      .order("updated_at", {
        ascending: false,
      });

    if (doorCountError) {
      console.error(
        "❌ Admin dashboard door_counts lookup failed:",
        doorCountError,
      );

      return new Map<string, DoorCountRow>();
    }

    const latestByJeepId = new Map<string, DoorCountRow>();

    (data ?? []).forEach((row: DoorCountRow) => {
      if (!row.jeep_id) {
        return;
      }

      /*
       * Because rows are newest first, the first row we encounter
       * for each jeepney is its latest door-count record.
       */
      if (!latestByJeepId.has(row.jeep_id)) {
        latestByJeepId.set(row.jeep_id, row);
      }
    });

    return latestByJeepId;
  }, []);

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        console.log("📊 Loading admin dashboard jeepneys...");

        const { data, error: fetchError } = await supabase
          .from("jeepneys")
          .select(SELECT_COLUMNS)
          .order("terminal_id", {
            ascending: true,
          })
          .order("queue_position", {
            ascending: true,
            nullsFirst: false,
          });

        if (fetchError) {
          console.error("❌ Admin dashboard jeepney query failed:", fetchError);

          throw fetchError;
        }

        const rawJeepneys = data ?? [];

        /*
         * ----------------------------------------------------------
         * Latest door counts
         * ----------------------------------------------------------
         *
         * door_counts is the direct passenger-count source.
         *
         * current_occupancy is still retained as the fallback value
         * from jeepneys when a jeepney does not have a door-count row.
         */
        const jeepneyIds = rawJeepneys
          .map((item: any) => item.id)
          .filter(Boolean);

        const latestDoorCounts = await loadDoorCounts(jeepneyIds);

        /*
         * Latest GPS ping per jeepney.
         * Informational only.
         */
        const { data: gpsRecords, error: gpsError } = await supabase
          .from("latest_gps_tracking")
          .select("jeepney_id, recorded_at")
          .order("recorded_at", {
            ascending: false,
          });

        if (gpsError) {
          console.error("❌ Admin dashboard GPS lookup failed:", gpsError);
        }

        const lastGpsById = new Map<string, string>();

        gpsRecords?.forEach((record: any) => {
          if (!record.jeepney_id || lastGpsById.has(record.jeepney_id)) {
            return;
          }

          lastGpsById.set(record.jeepney_id, record.recorded_at);
        });

        const normalized: AdminJeepney[] = rawJeepneys.map((item: any) => {
          const doorCount = latestDoorCounts.get(item.id);

          const doorTotal =
            doorCount != null
              ? Number(doorCount.front_count ?? 0) +
                Number(doorCount.rear_count ?? 0)
              : Number(item.current_occupancy ?? 0);

          return {
            id: item.id,

            plate_number: item.plate_number ?? "",

            jeep_name: item.jeep_name ?? null,

            driver_name: item.driver_name ?? null,

            driver_id: item.driver_id ?? null,

            bracket: Number(item.bracket ?? 0),

            capacity: Number(item.capacity ?? 24),

            /*
             * Direct live passenger total:
             *
             * front_count + rear_count
             */
            current_occupancy: doorTotal,

            last_occupancy_update:
              doorCount?.updated_at ?? item.last_occupancy_update ?? null,

            status: (item.status ?? "inactive") as JeepneyStatus,

            queue_position:
              item.queue_position === null || item.queue_position === undefined
                ? null
                : Number(item.queue_position),

            departure_time: item.departure_time ?? null,

            eta:
              item.eta === null || item.eta === undefined
                ? null
                : Number(item.eta),

            current_latitude:
              item.current_latitude === null ||
              item.current_latitude === undefined
                ? null
                : Number(item.current_latitude),

            current_longitude:
              item.current_longitude === null ||
              item.current_longitude === undefined
                ? null
                : Number(item.current_longitude),

            terminal_id: Number(item.terminal_id ?? 1),

            loading_ends_at: item.loading_ends_at ?? null,

            created_at: item.created_at ?? new Date().toISOString(),

            updated_at: item.updated_at ?? new Date().toISOString(),

            last_gps_at: lastGpsById.get(item.id) ?? null,
          };
        });

        setJeepneys(normalized);

        console.log(`✅ Admin dashboard loaded ${normalized.length} jeepneys`);
      } catch (err: any) {
        console.error("❌ Admin dashboard loading error:", err);

        setError(err?.message ?? "Unable to load jeepney dashboard data.");

        setJeepneys([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadDoorCounts],
  );

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  /*
   * Re-check operating window every minute.
   *
   * 5 AM - 9 PM.
   */
  useEffect(() => {
    const tick = () => {
      setIsOperatingHours(isWithinOperatingHours());
      setOperatingHoursMessage(getOutsideHoursMessage());
    };

    tick();

    const interval = setInterval(tick, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  /*
   * --------------------------------------------------------------
   * REALTIME
   * --------------------------------------------------------------
   *
   * jeepneys:
   *   - fleet changes
   *   - status changes
   *   - database occupancy mirror changes
   *
   * door_counts:
   *   - DIRECT passenger counter source
   *
   * gps_tracking:
   *   - latest GPS ping
   */
  useEffect(() => {
    let cancelled = false;

    console.log("📡 Starting admin dashboard realtime subscription...");

    const channel = supabase
      .channel("admin-jeepneys-dashboard")

      /*
       * ----------------------------------------------------------
       * JEEPNEY INSERT
       * ----------------------------------------------------------
       */
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          if (cancelled) return;

          console.log("🟢 Jeepney inserted:", payload.new);

          void loadDashboard(true);
        },
      )

      /*
       * ----------------------------------------------------------
       * JEEPNEY UPDATE
       * ----------------------------------------------------------
       */
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          if (cancelled) return;

          console.log("🔄 Jeepney updated:", payload.new);

          const updated = payload.new as any;

          setJeepneys((current) =>
            current.map((jeepney) => {
              if (jeepney.id !== updated.id) {
                return jeepney;
              }

              return {
                ...jeepney,

                plate_number: updated.plate_number ?? jeepney.plate_number,

                jeep_name: updated.jeep_name ?? jeepney.jeep_name,

                driver_name: updated.driver_name ?? jeepney.driver_name,

                driver_id: updated.driver_id ?? jeepney.driver_id,

                bracket: Number(updated.bracket ?? jeepney.bracket),

                capacity: Number(updated.capacity ?? jeepney.capacity),

                current_occupancy: Number(
                  updated.current_occupancy ?? jeepney.current_occupancy,
                ),

                last_occupancy_update:
                  updated.last_occupancy_update ??
                  jeepney.last_occupancy_update,

                status: (updated.status ?? jeepney.status) as JeepneyStatus,

                queue_position:
                  updated.queue_position === null ||
                  updated.queue_position === undefined
                    ? null
                    : Number(updated.queue_position),

                departure_time:
                  updated.departure_time ?? jeepney.departure_time,

                eta:
                  updated.eta === null || updated.eta === undefined
                    ? null
                    : Number(updated.eta),

                current_latitude:
                  updated.current_latitude === null ||
                  updated.current_latitude === undefined
                    ? jeepney.current_latitude
                    : Number(updated.current_latitude),

                current_longitude:
                  updated.current_longitude === null ||
                  updated.current_longitude === undefined
                    ? jeepney.current_longitude
                    : Number(updated.current_longitude),

                terminal_id: Number(updated.terminal_id ?? jeepney.terminal_id),

                loading_ends_at:
                  updated.loading_ends_at ?? jeepney.loading_ends_at,

                updated_at: updated.updated_at ?? jeepney.updated_at,
              };
            }),
          );
        },
      )

      /*
       * ----------------------------------------------------------
       * JEEPNEY DELETE
       * ----------------------------------------------------------
       */
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          if (cancelled) return;

          console.log("🔴 Jeepney deleted:", payload.old);

          const deleted = payload.old as any;

          setJeepneys((current) =>
            current.filter((jeepney) => jeepney.id !== deleted.id),
          );
        },
      )

      /*
       * ----------------------------------------------------------
       * DOOR COUNT INSERT
       * ----------------------------------------------------------
       *
       * This is the primary live passenger-count event.
       */
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "door_counts",
        },
        (payload) => {
          if (cancelled) return;

          const doorCount = payload.new as DoorCountRow;

          if (!doorCount.jeep_id) {
            return;
          }

          const total =
            Number(doorCount.front_count ?? 0) +
            Number(doorCount.rear_count ?? 0);

          const updatedAt = doorCount.updated_at ?? new Date().toISOString();

          console.log("🚪 Dashboard door count INSERT:", {
            jeep_id: doorCount.jeep_id,
            front_count: doorCount.front_count,
            rear_count: doorCount.rear_count,
            total,
          });

          setJeepneys((current) =>
            current.map((jeepney) =>
              jeepney.id === doorCount.jeep_id
                ? {
                    ...jeepney,
                    current_occupancy: total,
                    last_occupancy_update: updatedAt,
                  }
                : jeepney,
            ),
          );
        },
      )

      /*
       * ----------------------------------------------------------
       * DOOR COUNT UPDATE
       * ----------------------------------------------------------
       *
       * Example:
       *
       * front 8 + rear 5 = 13
       *
       * becomes:
       *
       * front 8 + rear 3 = 11
       *
       * The dashboard immediately changes to 11.
       */
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "door_counts",
        },
        (payload) => {
          if (cancelled) return;

          const doorCount = payload.new as DoorCountRow;

          if (!doorCount.jeep_id) {
            return;
          }

          const total =
            Number(doorCount.front_count ?? 0) +
            Number(doorCount.rear_count ?? 0);

          const updatedAt = doorCount.updated_at ?? new Date().toISOString();

          console.log("🚪 Dashboard door count UPDATE:", {
            jeep_id: doorCount.jeep_id,
            front_count: doorCount.front_count,
            rear_count: doorCount.rear_count,
            total,
          });

          setJeepneys((current) =>
            current.map((jeepney) =>
              jeepney.id === doorCount.jeep_id
                ? {
                    ...jeepney,
                    current_occupancy: total,
                    last_occupancy_update: updatedAt,
                  }
                : jeepney,
            ),
          );
        },
      )

      /*
       * ----------------------------------------------------------
       * GPS INSERT
       * ----------------------------------------------------------
       */
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
        },
        (payload) => {
          if (cancelled) return;

          const gps = payload.new as any;

          const jeepneyId = String(gps.jeepney_id);

          const recordedAt = gps.recorded_at ?? new Date().toISOString();

          setJeepneys((current) =>
            current.map((jeepney) =>
              jeepney.id === jeepneyId
                ? {
                    ...jeepney,
                    last_gps_at: recordedAt,
                  }
                : jeepney,
            ),
          );
        },
      )

      .subscribe((status, err) => {
        if (cancelled) return;

        console.log("📡 Admin dashboard realtime:", status);

        if (status === "SUBSCRIBED") {
          console.log("✅ Admin dashboard realtime connected");
        }

        if (status === "CHANNEL_ERROR") {
          console.error("❌ Admin dashboard realtime channel error:", err);
        }

        if (status === "TIMED_OUT") {
          console.error("⏱️ Admin dashboard realtime timed out:", err);
        }
      });

    channelRef.current = channel;

    return () => {
      cancelled = true;

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      console.log("📡 Removing admin dashboard realtime...");

      void supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  /*
   * Waiting jeepneys.
   */
  const waitingJeepneys = useMemo(() => {
    return jeepneys
      .filter(
        (jeepney) =>
          jeepney.status === "waiting" && jeepney.queue_position !== null,
      )
      .sort(
        (a, b) => (a.queue_position ?? 999999) - (b.queue_position ?? 999999),
      );
  }, [jeepneys]);

  /*
   * Current loading jeepney.
   */
  const loadingJeepney = useMemo(() => {
    return jeepneys.find((jeepney) => jeepney.status === "loading") ?? null;
  }, [jeepneys]);

  /*
   * En-route jeepneys.
   */
  const enRouteJeepneys = useMemo(() => {
    return jeepneys.filter((jeepney) => jeepney.status === "en_route");
  }, [jeepneys]);

  /*
   * Dashboard statistics.
   */
  const stats = useMemo<AdminDashboardStats>(() => {
    if (!jeepneys || jeepneys.length === 0) {
      return EMPTY_STATS;
    }

    return {
      total: jeepneys.length,

      active: jeepneys.filter((j) => j.status !== "inactive").length,

      waiting: jeepneys.filter((j) => j.status === "waiting").length,

      loading: jeepneys.filter((j) => j.status === "loading").length,

      enRoute: jeepneys.filter((j) => j.status === "en_route").length,

      arrived: jeepneys.filter((j) => j.status === "arrived").length,

      dispatched: jeepneys.filter((j) => j.status === "dispatched").length,

      inactive: jeepneys.filter((j) => j.status === "inactive").length,
    };
  }, [jeepneys]);

  const refresh = useCallback(async () => {
    await loadDashboard(true);
  }, [loadDashboard]);

  return {
    jeepneys: jeepneys ?? [],

    waitingJeepneys: waitingJeepneys ?? [],

    enRouteJeepneys: enRouteJeepneys ?? [],

    loadingJeepney: loadingJeepney ?? null,

    stats: stats ?? EMPTY_STATS,

    loading,

    refreshing,

    error,

    refresh,

    isOperatingHours,

    operatingHoursMessage,
  };
}
