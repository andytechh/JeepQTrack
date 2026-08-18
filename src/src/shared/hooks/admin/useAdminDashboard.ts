import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../config/supabase";

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
   * Not a column on `jeepneys` - merged in client-side from
   * `latest_gps_tracking`. Used to decide whether a jeepney has
   * been "active today".
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

/* ============================================================
   HELPERS
============================================================ */

/*
 * A jeepney is "active today" if its most recent GPS ping was
 * recorded on the current calendar date (device-local time).
 * A jeepney that hasn't reported GPS at all today - even if its
 * `status` row still says "waiting" from yesterday - is excluded.
 */
function isActiveToday(recordedAt: string | null): boolean {
  if (!recordedAt) {
    return false;
  }

  const recorded = new Date(recordedAt);

  if (Number.isNaN(recorded.getTime())) {
    return false;
  }

  const now = new Date();

  return (
    recorded.getFullYear() === now.getFullYear() &&
    recorded.getMonth() === now.getMonth() &&
    recorded.getDate() === now.getDate()
  );
}

export function useAdminDashboard(): AdminDashboardResult {
  const [jeepneys, setJeepneys] = useState<AdminJeepney[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
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

      /*
       * Get latest GPS ping per jeepney so we can tell which ones
       * have actually been active today.
       */
      const { data: gpsRecords, error: gpsError } = await supabase
        .from("latest_gps_tracking")
        .select("jeepney_id, recorded_at")
        .order("recorded_at", {
          ascending: false,
        });

      if (gpsError) {
        // Don't hard-fail the dashboard over GPS lookup issues -
        // just fall back to no jeepneys being marked active-today.
        console.error("❌ Admin dashboard GPS lookup failed:", gpsError);
      }

      const lastGpsById = new Map<string, string>();

      gpsRecords?.forEach((record: any) => {
        if (!record.jeepney_id || lastGpsById.has(record.jeepney_id)) {
          return;
        }

        lastGpsById.set(record.jeepney_id, record.recorded_at);
      });

      const normalized: AdminJeepney[] = (data ?? []).map((item: any) => ({
        id: item.id,

        plate_number: item.plate_number ?? "",

        jeep_name: item.jeep_name ?? null,

        driver_name: item.driver_name ?? null,

        driver_id: item.driver_id ?? null,

        bracket: Number(item.bracket ?? 0),

        capacity: Number(item.capacity ?? 24),

        current_occupancy: Number(item.current_occupancy ?? 0),

        last_occupancy_update: item.last_occupancy_update ?? null,

        status: (item.status ?? "inactive") as JeepneyStatus,

        queue_position:
          item.queue_position === null || item.queue_position === undefined
            ? null
            : Number(item.queue_position),

        departure_time: item.departure_time ?? null,

        eta:
          item.eta === null || item.eta === undefined ? null : Number(item.eta),

        current_latitude:
          item.current_latitude === null || item.current_latitude === undefined
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
      }));

      setJeepneys(normalized);

      console.log(`✅ Admin dashboard loaded ${normalized.length} jeepneys`);
    } catch (err: any) {
      console.error("❌ Admin dashboard loading error:", err);

      setError(err?.message ?? "Unable to load jeepney dashboard data.");

      /*
       * Important:
       * Never leave arrays undefined after an error.
       */
      setJeepneys([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /*
   * Initial load.
   */
  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  /*
   * Realtime jeepney + GPS updates.
   */
  useEffect(() => {
    console.log("📡 Starting admin jeepney realtime subscription...");

    const channel = supabase
      .channel("admin-jeepneys-dashboard")

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          console.log("🟢 Jeepney inserted:", payload.new);

          loadDashboard(true);
        },
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          console.log("🔄 Jeepney updated:", payload.new);

          const updated = payload.new as any;

          setJeepneys((current) =>
            current.map((jeepney) => {
              if (jeepney.id !== updated.id) {
                return jeepney;
              }

              /*
               * `jeepneys` table rows don't carry `last_gps_at` -
               * preserve whatever we already had for it.
               */
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

      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          console.log("🔴 Jeepney deleted:", payload.old);

          const deleted = payload.old as any;

          setJeepneys((current) =>
            current.filter((jeepney) => jeepney.id !== deleted.id),
          );
        },
      )

      /*
       * GPS pings update `last_gps_at` directly in state, so a
       * jeepney flips into "active today" the moment it reports,
       * without waiting for a full dashboard reload.
       */
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
        },
        (payload) => {
          const gps = payload.new as any;

          const jeepneyId = String(gps.jeepney_id);

          const recordedAt = gps.recorded_at ?? new Date().toISOString();

          setJeepneys((current) =>
            current.map((jeepney) =>
              jeepney.id === jeepneyId
                ? { ...jeepney, last_gps_at: recordedAt }
                : jeepney,
            ),
          );
        },
      )

      .subscribe((status) => {
        console.log("📡 Admin jeepney realtime:", status);
      });

    channelRef.current = channel;

    return () => {
      console.log("📡 Removing admin jeepney realtime...");

      supabase.removeChannel(channel);

      channelRef.current = null;
    };
  }, [loadDashboard]);

  /*
   * Only jeepneys that have actually reported GPS today feed the
   * dashboard's sections and stats below.
   */
  const activeTodayJeepneys = useMemo(() => {
    return jeepneys.filter((jeepney) => isActiveToday(jeepney.last_gps_at));
  }, [jeepneys]);

  /*
   * Waiting jeepneys.
   *
   * Queue is stored directly in:
   * jeepneys.queue_position
   */
  const waitingJeepneys = useMemo(() => {
    return activeTodayJeepneys
      .filter(
        (jeepney) =>
          jeepney.status === "waiting" && jeepney.queue_position !== null,
      )
      .sort(
        (a, b) => (a.queue_position ?? 999999) - (b.queue_position ?? 999999),
      );
  }, [activeTodayJeepneys]);

  /*
   * Current loading jeepney.
   */
  const loadingJeepney = useMemo(() => {
    return (
      activeTodayJeepneys.find((jeepney) => jeepney.status === "loading") ??
      null
    );
  }, [activeTodayJeepneys]);

  /*
   * En-route jeepneys.
   */
  const enRouteJeepneys = useMemo(() => {
    return activeTodayJeepneys.filter(
      (jeepney) => jeepney.status === "en_route",
    );
  }, [activeTodayJeepneys]);

  /*
   * Statistics.
   */
  const stats = useMemo<AdminDashboardStats>(() => {
    if (!activeTodayJeepneys || activeTodayJeepneys.length === 0) {
      return EMPTY_STATS;
    }

    return {
      total: activeTodayJeepneys.length,

      active: activeTodayJeepneys.filter((j) => j.status !== "inactive").length,

      waiting: activeTodayJeepneys.filter((j) => j.status === "waiting").length,

      loading: activeTodayJeepneys.filter((j) => j.status === "loading").length,

      enRoute: activeTodayJeepneys.filter((j) => j.status === "en_route")
        .length,

      arrived: activeTodayJeepneys.filter((j) => j.status === "arrived").length,

      dispatched: activeTodayJeepneys.filter((j) => j.status === "dispatched")
        .length,

      inactive: activeTodayJeepneys.filter((j) => j.status === "inactive")
        .length,
    };
  }, [activeTodayJeepneys]);

  const refresh = useCallback(async () => {
    await loadDashboard(true);
  }, [loadDashboard]);

  return {
    /*
     * Always arrays. Exposed as the active-today set so any screen
     * consuming `jeepneys` directly also gets the filtered view.
     */
    jeepneys: activeTodayJeepneys ?? [],

    waitingJeepneys: waitingJeepneys ?? [],

    enRouteJeepneys: enRouteJeepneys ?? [],

    /*
     * Nullable object.
     */
    loadingJeepney: loadingJeepney ?? null,

    /*
     * Always valid statistics.
     */
    stats: stats ?? EMPTY_STATS,

    loading,

    refreshing,

    error,

    refresh,
  };
}
