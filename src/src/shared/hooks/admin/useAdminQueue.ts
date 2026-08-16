import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../config/supabase";
import { calculateJeepneyEta } from "../../utils/routeEta";

export type JeepneyStatus =
  "waiting" | "loading" | "en_route" | "arrived" | "dispatched" | "inactive";

export interface AdminQueueJeepney {
  id: string;
  plate_number: string;
  bracket: number;
  capacity: number | null;
  status: JeepneyStatus;
  current_occupancy: number | null;
  last_occupancy_update: string | null;
  queue_position: number | null;
  departure_time: string | null;
  eta: number | null;
  jeep_name: string | null;
  driver_name: string | null;
  driver_id: string | null;
  terminal_id: number | null;
  loading_ends_at: string | null;
  departed_at: string | null;
  updated_at: string | null;
}

export type QueueTerminal = "all" | 1 | 2;

interface UseAdminQueueResult {
  jeepneys: AdminQueueJeepney[];

  loadingJeepney: AdminQueueJeepney | null;

  waitingJeepneys: AdminQueueJeepney[];

  enRouteJeepneys: AdminQueueJeepney[];

  arrivedJeepneys: AdminQueueJeepney[];

  activeJeepneys: AdminQueueJeepney[];

  totalWaiting: number;

  terminal: QueueTerminal;

  setTerminal: (terminal: QueueTerminal) => void;

  loading: boolean;

  refreshing: boolean;

  error: string | null;

  refresh: () => Promise<void>;
}

const QUEUE_COLUMNS = `
  id,
  plate_number,
  bracket,
  capacity,
  status,
  current_occupancy,
  last_occupancy_update,
  queue_position,
  departure_time,
  eta,
  jeep_name,
  driver_name,
  driver_id,
  terminal_id,
  loading_ends_at,
  departed_at,
  updated_at
`;

// How often to recompute ETA for en-route jeepneys while they're on the road -
// GPS positions change continuously but jeepneys don't refetch on their own,
// so this keeps ETA fresh without needing a realtime subscription on gps_tracking.
const ETA_REFRESH_INTERVAL_MS = 25000;

export function useAdminQueue(): UseAdminQueueResult {
  const [jeepneys, setJeepneys] = useState<AdminQueueJeepney[]>([]);

  const [terminal, setTerminal] = useState<QueueTerminal>("all");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /*
   * ============================================================
   * LIVE ETA
   *
   * The `eta` column on jeepneys isn't kept up to date by anything -
   * this looks up each en_route/dispatched jeepney's latest GPS fix and
   * computes a real road-route ETA (same logic used on the commuter map
   * and queue screens), then patches it into local state.
   * ============================================================
   */

  const attachEtas = useCallback(async (list: AdminQueueJeepney[]) => {
    const enRoute = list.filter(
      (j) =>
        (j.status === "en_route" || j.status === "dispatched") &&
        j.terminal_id != null,
    );
    if (enRoute.length === 0) return;

    try {
      const ids = enRoute.map((j) => j.id);

      const { data: gpsRows, error: gpsError } = await supabase
        .from("latest_gps_tracking")
        .select("jeepney_id, latitude, longitude, speed")
        .in("jeepney_id", ids);

      if (gpsError) {
        console.error("❌ Admin queue GPS lookup for ETA failed:", gpsError);
        return;
      }

      const gpsByJeepneyId = new Map<
        string,
        { lat: number; lng: number; speed: number }
      >();
      (gpsRows || []).forEach((row: any) => {
        const lat = Number(row.latitude);
        const lng = Number(row.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          gpsByJeepneyId.set(row.jeepney_id, {
            lat,
            lng,
            speed: Number(row.speed || 0),
          });
        }
      });

      const results = await Promise.all(
        enRoute.map(async (j) => {
          const gps = gpsByJeepneyId.get(j.id);
          if (!gps || j.terminal_id == null)
            return { id: j.id, etaMinutes: null };

          const eta = await calculateJeepneyEta(
            gps.lat,
            gps.lng,
            j.terminal_id,
            gps.speed,
          );
          if (!eta) return { id: j.id, etaMinutes: null };

          return { id: j.id, etaMinutes: Math.round(eta.remainingMinutes) };
        }),
      );

      setJeepneys((current) =>
        current.map((j) => {
          const result = results.find((r) => r.id === j.id);
          // Only overwrite when we actually got a fresh reading - keep showing the
          // last known ETA rather than flipping to "unavailable" on a single missed GPS row.
          return result && result.etaMinutes !== null
            ? { ...j, eta: result.etaMinutes }
            : j;
        }),
      );
    } catch (err) {
      console.error("❌ Admin queue: unexpected error attaching ETAs:", err);
    }
  }, []);

  /*
   * ============================================================
   * LOAD QUEUE
   * ============================================================
   */

  const loadQueue = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const { data, error: fetchError } = await supabase
          .from("jeepneys")
          .select(QUEUE_COLUMNS)
          .in("status", [
            "waiting",
            "loading",
            "en_route",
            "dispatched",
            "arrived",
          ])
          .order("queue_position", {
            ascending: true,
            nullsFirst: false,
          });

        if (fetchError) {
          console.error("❌ Admin queue fetch error:", fetchError);

          setError(fetchError.message);

          return;
        }

        const rows = (data ?? []) as AdminQueueJeepney[];
        setJeepneys(rows);
        setLoading(false);
        setRefreshing(false);

        // Don't block the queue list on GPS + route lookups - fill ETAs in after.
        await attachEtas(rows);
      } catch (err: any) {
        console.error("❌ Admin queue load exception:", err);

        setError(err?.message ?? "Unable to load queue.");
        setLoading(false);
        setRefreshing(false);
      }
    },
    [attachEtas],
  );

  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  /*
   * ============================================================
   * PERIODIC ETA REFRESH
   *
   * Recomputes ETA for whatever's currently en route/dispatched, without
   * refetching the whole jeepneys table each time.
   * ============================================================
   */

  useEffect(() => {
    const interval = setInterval(() => {
      setJeepneys((current) => {
        attachEtas(current);
        return current;
      });
    }, ETA_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [attachEtas]);

  /*
   * ============================================================
   * REALTIME
   * ============================================================
   */

  useEffect(() => {
    const channelName = "admin-jeepneys-queue";

    console.log("📡 Subscribing to admin queue:", channelName);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(channelName)

      /*
       * --------------------------------------------------------
       * INSERT
       * --------------------------------------------------------
       */

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          const incoming = payload.new as AdminQueueJeepney;

          console.log("🟢 Jeepney added to queue:", incoming.plate_number);

          setJeepneys((current) => {
            const exists = current.some(
              (jeepney) => jeepney.id === incoming.id,
            );

            if (exists) {
              return current;
            }

            return [...current, incoming];
          });

          attachEtas([incoming]);
        },
      )

      /*
       * --------------------------------------------------------
       * UPDATE
       * --------------------------------------------------------
       */

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          const updated = payload.new as AdminQueueJeepney;

          console.log(
            "🔄 Jeepney queue updated:",
            updated.plate_number,
            updated.status,
            updated.queue_position,
          );

          setJeepneys((current) => {
            /*
             * If it becomes inactive, remove it from
             * the queue list.
             */

            if (updated.status === "inactive") {
              return current.filter((jeepney) => jeepney.id !== updated.id);
            }

            const exists = current.some((jeepney) => jeepney.id === updated.id);

            if (!exists) {
              return [...current, updated];
            }

            return current.map((jeepney) =>
              jeepney.id === updated.id ? updated : jeepney,
            );
          });

          // A status change (e.g. waiting -> en_route) needs a fresh ETA lookup;
          // an ordinary field update on an already en-route jeepney is harmless to
          // recompute too since attachEtas() no-ops for anything not en route.
          if (updated.status !== "inactive") {
            attachEtas([updated]);
          }
        },
      )

      /*
       * --------------------------------------------------------
       * DELETE
       * --------------------------------------------------------
       */

      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          const deleted = payload.old as Partial<AdminQueueJeepney>;

          if (!deleted.id) {
            return;
          }

          console.log("🗑️ Jeepney removed:", deleted.id);

          setJeepneys((current) =>
            current.filter((jeepney) => jeepney.id !== deleted.id),
          );
        },
      )

      .subscribe((status) => {
        console.log("📡 Admin queue realtime:", status);

        if (status === "SUBSCRIBED") {
          console.log("✅ Admin queue realtime connected");
        }

        if (status === "CHANNEL_ERROR") {
          console.error("❌ Admin queue realtime channel error");
        }

        if (status === "TIMED_OUT") {
          console.error("⏱️ Admin queue realtime timed out");
        }
      });

    channelRef.current = channel;

    return () => {
      console.log("📡 Removing admin queue realtime");

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [attachEtas]);

  /*
   * ============================================================
   * TERMINAL FILTER
   * ============================================================
   */

  const filteredJeepneys = useMemo(() => {
    if (terminal === "all") {
      return jeepneys;
    }

    return jeepneys.filter((jeepney) => jeepney.terminal_id === terminal);
  }, [jeepneys, terminal]);

  /*
   * ============================================================
   * LOADING JEEPNEY
   *
   * Your database constraint guarantees:
   *
   * loading -> queue_position = 1
   * ============================================================
   */

  const loadingJeepney = useMemo(() => {
    return (
      filteredJeepneys.find(
        (jeepney) =>
          jeepney.status === "loading" && jeepney.queue_position === 1,
      ) ?? null
    );
  }, [filteredJeepneys]);

  /*
   * ============================================================
   * WAITING QUEUE
   *
   * queue_position is the source of truth.
   * ============================================================
   */

  const waitingJeepneys = useMemo(() => {
    return filteredJeepneys
      .filter(
        (jeepney) =>
          jeepney.status === "waiting" && jeepney.queue_position !== null,
      )
      .sort((a, b) => {
        return (
          (a.queue_position ?? Number.MAX_SAFE_INTEGER) -
          (b.queue_position ?? Number.MAX_SAFE_INTEGER)
        );
      });
  }, [filteredJeepneys]);

  /*
   * ============================================================
   * EN ROUTE
   * ============================================================
   */

  const enRouteJeepneys = useMemo(() => {
    return filteredJeepneys
      .filter(
        (jeepney) =>
          jeepney.status === "en_route" || jeepney.status === "dispatched",
      )
      .sort((a, b) => {
        const aTime = a.departure_time
          ? new Date(a.departure_time).getTime()
          : 0;

        const bTime = b.departure_time
          ? new Date(b.departure_time).getTime()
          : 0;

        return bTime - aTime;
      });
  }, [filteredJeepneys]);

  /*
   * ============================================================
   * ARRIVED
   * ============================================================
   */

  const arrivedJeepneys = useMemo(() => {
    return filteredJeepneys
      .filter((jeepney) => jeepney.status === "arrived")
      .sort((a, b) => {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;

        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;

        return bTime - aTime;
      });
  }, [filteredJeepneys]);

  /*
   * ============================================================
   * ACTIVE
   * ============================================================
   */

  const activeJeepneys = useMemo(() => {
    return filteredJeepneys.filter(
      (jeepney) => jeepney.status === "waiting" || jeepney.status === "loading",
    );
  }, [filteredJeepneys]);

  /*
   * ============================================================
   * REFRESH
   * ============================================================
   */

  const refresh = useCallback(async () => {
    await loadQueue(true);
  }, [loadQueue]);

  return {
    jeepneys: filteredJeepneys,

    loadingJeepney,

    waitingJeepneys,

    enRouteJeepneys,

    arrivedJeepneys,

    activeJeepneys,

    totalWaiting: waitingJeepneys.length,

    terminal,

    setTerminal,

    loading,

    refreshing,

    error,

    refresh,
  };
}
