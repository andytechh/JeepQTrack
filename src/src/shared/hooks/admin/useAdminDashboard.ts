import { useCallback, useEffect, useMemo, useState } from "react";
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

export function useAdminDashboard(): AdminDashboardResult {
  const [jeepneys, setJeepneys] = useState<AdminJeepney[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

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
   * Realtime jeepney updates.
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

          loadDashboard(true);
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

          loadDashboard(true);
        },
      )

      .subscribe((status) => {
        console.log("📡 Admin jeepney realtime:", status);
      });

    return () => {
      console.log("📡 Removing admin jeepney realtime...");

      supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  /*
   * Waiting jeepneys.
   *
   * Queue is stored directly in:
   * jeepneys.queue_position
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
   * Statistics.
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
    /*
     * Always arrays.
     */
    jeepneys: jeepneys ?? [],

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
