import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "../../config/supabase";
import { DispatchService } from "../../services/DispatchService";
import { useAuthStore } from "../../store/authStore";

import {
  getOutsideHoursMessage,
  isWithinOperatingHours,
} from "../../utils/operatingHours";

export interface QueueJeepney {
  id: string;
  plate_number: string;
  jeep_name: string | null;
  driver_name: string | null;
  driver_id: string | null;
  status: string;
  current_occupancy: number;
  capacity: number;
  terminal_id: number | null;
  bracket: number;
  queue_position: number | null;
  departure_time: string | null;
  eta: number | null;
  last_location_update: string | null;
  loading_started_at: string | null;
  loading_ends_at: string | null;
  departed_at: string | null;

  // Live door counter values
  front_count: number;
  rear_count: number;
  occupancy_updated_at: string | null;
}

export interface RecentTrip {
  id: string;
  jeepney_id: string | null;
  route: string | null;
  total_passengers: number;
  departure_time: string | null;
  arrival_time: string | null;
  status: string | null;
  jeepney: {
    plate_number: string;
    driver_name: string | null;
    jeep_name: string | null;
    terminal_id: number | null;
  } | null;
}

export interface QueueTerminalSection {
  terminalId: 1 | 2;
  terminalName: string;
  subtitle: string;
  jeepneys: QueueJeepney[];
}

interface UseDispatcherQueueResult {
  jeepneys: QueueJeepney[];
  recentTrips: RecentTrip[];
  sections: QueueTerminalSection[];

  waitingCount: number;
  loadingCount: number;
  enRouteCount: number;
  totalCount: number;

  loading: boolean;
  refreshing: boolean;
  error: string | null;

  dispatchingId: string | null;

  isOperatingHours: boolean;
  operatingHoursMessage: string;

  refresh: () => Promise<void>;

  dispatchJeepney: (jeepney: QueueJeepney) => Promise<{
    success: boolean;
    message: string;
  }>;
}

interface DoorCountRow {
  jeepney_id: string;
  front_count: number | null;
  rear_count: number | null;
  updated_at: string | null;
}

const TERMINAL_NAMES = {
  1: {
    name: "Donsol",
    subtitle: "Terminal 1",
  },
  2: {
    name: "Daraga",
    subtitle: "Terminal 2",
  },
} as const;

export function useDispatcherQueue(): UseDispatcherQueueResult {
  const { user } = useAuthStore();

  const [jeepneys, setJeepneys] = useState<QueueJeepney[]>([]);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const [isOperatingHours, setIsOperatingHours] = useState(
    isWithinOperatingHours(),
  );

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const realtimeInstanceRef = useRef(0);

  /**
   * Get the latest door-count row for every jeepney.
   *
   * Live occupancy source:
   *
   * front_count + rear_count
   *
   * NOTE:
   * This assumes the door_counts table contains:
   * jeepney_id
   * front_count
   * rear_count
   * updated_at
   */
  const fetchDoorCounts = useCallback(async (jeepneyIds: string[]) => {
    const result = new Map<
      string,
      {
        front_count: number;
        rear_count: number;
        occupancy_updated_at: string | null;
      }
    >();

    if (jeepneyIds.length === 0) {
      return result;
    }

    const { data, error: doorError } = await supabase
      .from("door_counts")
      .select(
        `
          jeepney_id,
          front_count,
          rear_count,
          updated_at
        `,
      )
      .in("jeepney_id", jeepneyIds)
      .order("updated_at", {
        ascending: false,
        nullsLast: true,
      });

    if (doorError) {
      throw doorError;
    }

    for (const row of (data ?? []) as DoorCountRow[]) {
      if (!row.jeepney_id) {
        continue;
      }

      // Keep only the newest row for each jeepney.
      if (result.has(row.jeepney_id)) {
        continue;
      }

      result.set(row.jeepney_id, {
        front_count: Math.max(0, Number(row.front_count ?? 0)),
        rear_count: Math.max(0, Number(row.rear_count ?? 0)),
        occupancy_updated_at: row.updated_at ?? null,
      });
    }

    return result;
  }, []);

  /**
   * Fetch the current dispatcher queue.
   *
   * Operating hours:
   * 5:00 AM - 9:00 PM
   *
   * Outside operating hours we do NOT update the database.
   * We only hide the active queue locally.
   */
  const fetchQueue = useCallback(async () => {
    const currentlyOperating = isWithinOperatingHours();

    setIsOperatingHours(currentlyOperating);

    const { data, error: queueError } = await supabase
      .from("jeepneys")
      .select(
        `
          id,
          plate_number,
          jeep_name,
          driver_name,
          driver_id,
          status,
          current_occupancy,
          capacity,
          terminal_id,
          bracket,
          queue_position,
          departure_time,
          eta,
          last_location_update,
          loading_started_at,
          loading_ends_at,
          departed_at
        `,
      )
      .in("status", ["waiting", "loading"])
      .order("terminal_id", {
        ascending: true,
        nullsLast: true,
      })
      .order("bracket", {
        ascending: true,
      })
      .order("queue_position", {
        ascending: true,
        nullsLast: true,
      });

    if (queueError) {
      throw queueError;
    }

    const rows = (data ?? []) as QueueJeepney[];

    /**
     * After 9 PM / before 5 AM:
     * hide active queue from the dispatcher.
     *
     * IMPORTANT:
     * No Supabase status is changed.
     */
    if (!currentlyOperating) {
      setJeepneys([]);
      return;
    }

    const doorCounts = await fetchDoorCounts(rows.map((jeepney) => jeepney.id));

    const normalized: QueueJeepney[] = rows.map((jeepney) => {
      const door = doorCounts.get(jeepney.id);

      /**
       * If a door-count row has not been created yet,
       * preserve the existing jeepney.current_occupancy.
       */
      if (!door) {
        return {
          ...jeepney,
          current_occupancy: Math.max(
            0,
            Number(jeepney.current_occupancy ?? 0),
          ),
          front_count: 0,
          rear_count: 0,
          occupancy_updated_at: null,
        };
      }

      const occupancy = door.front_count + door.rear_count;

      return {
        ...jeepney,

        front_count: door.front_count,
        rear_count: door.rear_count,

        // Door counts are now the authoritative live occupancy.
        current_occupancy: occupancy,

        occupancy_updated_at: door.occupancy_updated_at,
      };
    });

    setJeepneys(normalized);
  }, [fetchDoorCounts]);

  /**
   * Fetch recent trips.
   *
   * Historical passenger totals continue to come from:
   * trips.total_passengers
   */
  const fetchRecentTrips = useCallback(async () => {
    const { data, error: tripsError } = await supabase
      .from("trips")
      .select(
        `
          id,
          jeepney_id,
          route,
          total_passengers,
          departure_time,
          arrival_time,
          status,
          jeepneys:jeepney_id (
            plate_number,
            driver_name,
            jeep_name,
            terminal_id
          )
        `,
      )
      .order("departure_time", {
        ascending: false,
      })
      .limit(8);

    if (tripsError) {
      throw tripsError;
    }

    const normalized: RecentTrip[] = (data ?? []).map((trip: any) => {
      const jeepney = Array.isArray(trip.jeepneys)
        ? trip.jeepneys[0]
        : trip.jeepneys;

      return {
        id: trip.id,
        jeepney_id: trip.jeepney_id,
        route: trip.route,
        total_passengers: trip.total_passengers ?? 0,
        departure_time: trip.departure_time,
        arrival_time: trip.arrival_time,
        status: trip.status,
        jeepney: jeepney
          ? {
              plate_number: jeepney.plate_number ?? "",
              driver_name: jeepney.driver_name ?? null,
              jeep_name: jeepney.jeep_name ?? null,
              terminal_id: jeepney.terminal_id ?? null,
            }
          : null,
      };
    });

    setRecentTrips(normalized);
  }, []);

  /**
   * Fetch everything.
   */
  const fetchAll = useCallback(async () => {
    setError(null);

    try {
      await Promise.all([fetchQueue(), fetchRecentTrips()]);
    } catch (err: any) {
      console.error("Failed to load dispatcher queue:", err);

      setError(
        err?.message ||
          "Unable to load the dispatcher queue. Please try again.",
      );
    }
  }, [fetchQueue, fetchRecentTrips]);

  /**
   * Manual refresh.
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll]);

  /**
   * Dispatch a jeepney.
   */
  const dispatchJeepney = useCallback(
    async (jeepney: QueueJeepney) => {
      /**
       * Do not allow dispatch outside service hours.
       */
      if (!isWithinOperatingHours()) {
        return {
          success: false,
          message: getOutsideHoursMessage(),
        };
      }

      if (!user?.uid) {
        return {
          success: false,
          message: "Your dispatcher account could not be verified.",
        };
      }

      if (!jeepney.id) {
        return {
          success: false,
          message: "Invalid jeepney.",
        };
      }

      setDispatchingId(jeepney.id);

      try {
        const result = await DispatchService.dispatchJeepney(
          jeepney.id,
          user.uid,
        );

        if (!result) {
          return {
            success: false,
            message: "Unable to send the dispatch alert.",
          };
        }

        await Promise.all([fetchQueue(), fetchRecentTrips()]);

        return {
          success: true,
          message: `Dispatch alert sent to ${
            jeepney.jeep_name || jeepney.plate_number
          }.`,
        };
      } catch (err: any) {
        console.error("Dispatcher dispatch error:", err);

        return {
          success: false,
          message:
            err?.message ||
            "Unable to send the dispatch alert. Please try again.",
        };
      } finally {
        setDispatchingId(null);
      }
    },
    [fetchQueue, fetchRecentTrips, user?.uid],
  );

  /**
   * Initial load.
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) {
        return;
      }

      setLoading(true);

      try {
        await fetchAll();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [fetchAll]);

  /**
   * Re-check service hours every minute.
   *
   * This is LOCAL UI logic only.
   * It never changes jeepneys.status.
   */
  useEffect(() => {
    const checkOperatingHours = () => {
      const nextOperatingState = isWithinOperatingHours();

      setIsOperatingHours((previous) => {
        if (previous !== nextOperatingState) {
          void fetchAll();
        }

        return nextOperatingState;
      });
    };

    checkOperatingHours();

    const interval = setInterval(checkOperatingHours, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchAll]);

  /**
   * Supabase Realtime.
   *
   * jeepneys:
   *   queue/status changes
   *
   * trips:
   *   recent trip changes
   *
   * door_counts:
   *   live passenger count
   */
  useEffect(() => {
    const instanceId = ++realtimeInstanceRef.current;

    let cancelled = false;

    /**
     * Remove previous channel safely.
     */
    if (channelRef.current) {
      const previousChannel = channelRef.current;

      channelRef.current = null;

      void supabase.removeChannel(previousChannel);
    }

    const channel = supabase
      .channel(`dispatcher-queue-realtime-${instanceId}`)

      /**
       * Jeepney changes
       */
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jeepneys",
        },
        () => {
          if (cancelled) {
            return;
          }

          void fetchQueue();
        },
      )

      /**
       * Trip changes
       */
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trips",
        },
        () => {
          if (cancelled) {
            return;
          }

          void fetchRecentTrips();
        },
      )

      /**
       * New door-count record.
       *
       * Example:
       *
       * front_count = 6
       * rear_count  = 4
       *
       * occupancy = 10
       */
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "door_counts",
        },
        (payload) => {
          if (cancelled || !isWithinOperatingHours()) {
            return;
          }

          const row = payload.new as Partial<DoorCountRow>;

          if (!row.jeepney_id) {
            return;
          }

          const frontCount = Math.max(0, Number(row.front_count ?? 0));

          const rearCount = Math.max(0, Number(row.rear_count ?? 0));

          const occupancy = frontCount + rearCount;

          setJeepneys((current) =>
            current.map((jeepney) =>
              jeepney.id === row.jeepney_id
                ? {
                    ...jeepney,

                    front_count: frontCount,
                    rear_count: rearCount,

                    current_occupancy: occupancy,

                    occupancy_updated_at:
                      row.updated_at ?? new Date().toISOString(),
                  }
                : jeepney,
            ),
          );
        },
      )

      /**
       * Existing door-count record changed.
       *
       * This is the important part for:
       *
       * 10 passengers
       *      ↓
       * passenger exits
       *      ↓
       * 9 passengers
       *
       * The UI updates immediately.
       */
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "door_counts",
        },
        (payload) => {
          if (cancelled || !isWithinOperatingHours()) {
            return;
          }

          const row = payload.new as Partial<DoorCountRow>;

          if (!row.jeepney_id) {
            return;
          }

          const frontCount = Math.max(0, Number(row.front_count ?? 0));

          const rearCount = Math.max(0, Number(row.rear_count ?? 0));

          const occupancy = frontCount + rearCount;

          setJeepneys((current) =>
            current.map((jeepney) =>
              jeepney.id === row.jeepney_id
                ? {
                    ...jeepney,

                    front_count: frontCount,
                    rear_count: rearCount,

                    current_occupancy: occupancy,

                    occupancy_updated_at:
                      row.updated_at ?? new Date().toISOString(),
                  }
                : jeepney,
            ),
          );
        },
      )

      .subscribe((status, err) => {
        if (cancelled) {
          return;
        }

        console.log("📡 Dispatcher queue realtime:", status);

        if (status === "SUBSCRIBED") {
          console.log("✅ Dispatcher queue realtime connected");
        }

        if (status === "CHANNEL_ERROR") {
          console.error("❌ Dispatcher queue realtime channel error:", err);
        }

        if (status === "TIMED_OUT") {
          console.error("⏱️ Dispatcher queue realtime timed out:", err);
        }
      });

    channelRef.current = channel;

    /**
     * Cleanup.
     */
    return () => {
      cancelled = true;

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [fetchQueue, fetchRecentTrips]);

  /**
   * Split the queue by terminal.
   */
  const sections = useMemo<QueueTerminalSection[]>(() => {
    const terminalOne = jeepneys.filter((item) => item.terminal_id === 1);

    const terminalTwo = jeepneys.filter((item) => item.terminal_id === 2);

    return [
      {
        terminalId: 1,
        terminalName: TERMINAL_NAMES[1].name,
        subtitle: TERMINAL_NAMES[1].subtitle,
        jeepneys: terminalOne,
      },
      {
        terminalId: 2,
        terminalName: TERMINAL_NAMES[2].name,
        subtitle: TERMINAL_NAMES[2].subtitle,
        jeepneys: terminalTwo,
      },
    ];
  }, [jeepneys]);

  /**
   * Waiting count.
   */
  const waitingCount = useMemo(
    () => jeepneys.filter((item) => item.status === "waiting").length,
    [jeepneys],
  );

  /**
   * Loading count.
   */
  const loadingCount = useMemo(
    () => jeepneys.filter((item) => item.status === "loading").length,
    [jeepneys],
  );

  /**
   * En-route count from recent trips.
   */
  const enRouteCount = useMemo(
    () =>
      recentTrips.filter(
        (trip) =>
          trip.status === "active" ||
          trip.status === "en_route" ||
          !trip.arrival_time,
      ).length,
    [recentTrips],
  );

  return {
    jeepneys,
    recentTrips,
    sections,

    waitingCount,
    loadingCount,
    enRouteCount,
    totalCount: jeepneys.length,

    loading,
    refreshing,
    error,

    dispatchingId,

    isOperatingHours,

    operatingHoursMessage: isOperatingHours ? "" : getOutsideHoursMessage(),

    refresh,
    dispatchJeepney,
  };
}
