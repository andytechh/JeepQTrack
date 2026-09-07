import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "../../config/supabase";

import {
  getOutsideHoursMessage,
  isWithinOperatingHours,
} from "../../utils/operatingHours";

type Dispatcher = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  avatar_url: string | null;
  preferred_terminal: number | null;
  preferred_bracket: number | null;
};

type Terminal = {
  id: string;
  terminal_number: number;
  name: string;
  location: string | null;
  description: string | null;
  bracket_number: number;
  is_active: boolean;
  operating_start: string | null;
  operating_end: string | null;
};

type TerminalAssignment = {
  id: string;
  terminal_id: string;
  dispatcher_id: string;
  is_active: boolean;
};

type Jeepney = {
  id: string;
  plate_number: string;
  jeep_name: string | null;
  status: string | null;
  capacity: number | null;
  current_occupancy: number | null;

  // Live door counter values
  front_count: number;
  rear_count: number;
  occupancy_updated_at: string | null;

  driver_name: string | null;
  driver_id: string | null;
  queue_position: number | null;
  terminal_id: number | null;
  bracket: number | null;
  last_location_update: string | null;

  [key: string]: any;
};

type DoorCountRow = {
  jeepney_id: string;
  front_count: number | null;
  rear_count: number | null;
  updated_at: string | null;
};

type TripLog = {
  id: string;
  [key: string]: any;
};

type DashboardStats = {
  total: number;
  online: number;
  waiting: number;
  loading: number;
  enRoute: number;
  inactive: number;
  queue: number;
};

type DispatcherDashboardState = {
  dispatcher: Dispatcher | null;
  terminal: Terminal | null;
  assignment: TerminalAssignment | null;
  jeepneys: Jeepney[];
  queue: Jeepney[];
  nextToDispatch: Jeepney | null;
  tripLogs: TripLog[];
  stats: DashboardStats;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

const EMPTY_STATS: DashboardStats = {
  total: 0,
  online: 0,
  waiting: 0,
  loading: 0,
  enRoute: 0,
  inactive: 0,
  queue: 0,
};

export function useDispatcherDashboard() {
  const [state, setState] = useState<DispatcherDashboardState>({
    dispatcher: null,
    terminal: null,
    assignment: null,
    jeepneys: [],
    queue: [],
    nextToDispatch: null,
    tripLogs: [],
    stats: EMPTY_STATS,
    loading: true,
    refreshing: false,
    error: null,
  });

  const [isOperatingHours, setIsOperatingHours] = useState(
    isWithinOperatingHours(),
  );

  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );

  const realtimeInstanceRef = useRef(0);

  /**
   * Load latest door counts for the jeepneys.
   *
   * Live occupancy:
   *
   * front_count + rear_count
   *
   * Assumed door_counts columns:
   * - jeepney_id
   * - front_count
   * - rear_count
   * - updated_at
   */
  const fetchDoorCounts = useCallback(async (jeepneyIds: string[]) => {
    const doorMap = new Map<
      string,
      {
        front_count: number;
        rear_count: number;
        occupancy_updated_at: string | null;
      }
    >();

    if (jeepneyIds.length === 0) {
      return doorMap;
    }

    const { data, error } = await supabase
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

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as DoorCountRow[]) {
      if (!row.jeepney_id) {
        continue;
      }

      // The query is newest first.
      // Keep only the newest row for each jeepney.
      if (doorMap.has(row.jeepney_id)) {
        continue;
      }

      const frontCount = Math.max(0, Number(row.front_count ?? 0));

      const rearCount = Math.max(0, Number(row.rear_count ?? 0));

      doorMap.set(row.jeepney_id, {
        front_count: frontCount,
        rear_count: rearCount,
        occupancy_updated_at: row.updated_at ?? null,
      });
    }

    return doorMap;
  }, []);

  /**
   * Apply the latest door counts to jeepney records.
   */
  const applyDoorCounts = useCallback(
    (
      jeepneys: Jeepney[],
      doorMap: Map<
        string,
        {
          front_count: number;
          rear_count: number;
          occupancy_updated_at: string | null;
        }
      >,
    ): Jeepney[] => {
      return jeepneys.map((jeepney) => {
        const door = doorMap.get(jeepney.id);

        if (!door) {
          return {
            ...jeepney,

            front_count: Math.max(0, Number(jeepney.front_count ?? 0)),

            rear_count: Math.max(0, Number(jeepney.rear_count ?? 0)),

            current_occupancy: Math.max(
              0,
              Number(jeepney.current_occupancy ?? 0),
            ),

            occupancy_updated_at: jeepney.occupancy_updated_at ?? null,
          };
        }

        const occupancy = door.front_count + door.rear_count;

        return {
          ...jeepney,

          front_count: door.front_count,
          rear_count: door.rear_count,

          // Door counts are the live occupancy source.
          current_occupancy: occupancy,

          occupancy_updated_at: door.occupancy_updated_at,
        };
      });
    },
    [],
  );

  /**
   * Apply the operating-hours rule locally.
   *
   * IMPORTANT:
   * This does NOT update jeepneys.status in Supabase.
   *
   * Outside 5 AM - 9 PM:
   * waiting/loading/en_route/dispatched/arrived
   * are treated as inactive for the dispatcher UI.
   */
  const applyOperatingHours = useCallback((jeepneys: Jeepney[]) => {
    const operating = isWithinOperatingHours();

    if (operating) {
      return jeepneys;
    }

    return jeepneys.map((jeepney) => {
      const originalStatus = jeepney.status?.toLowerCase();

      const isLiveStatus =
        originalStatus === "waiting" ||
        originalStatus === "loading" ||
        originalStatus === "en_route" ||
        originalStatus === "dispatched" ||
        originalStatus === "arrived";

      if (!isLiveStatus) {
        return jeepney;
      }

      return {
        ...jeepney,

        // LOCAL UI STATUS ONLY.
        // Supabase is NOT modified.
        status: "inactive",
      };
    });
  }, []);

  /**
   * Load dashboard.
   */
  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        setState((current) => ({
          ...current,
          loading: !isRefresh && !current.dispatcher,
          refreshing: isRefresh,
          error: null,
        }));

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          throw new Error("No authenticated user was found.");
        }

        /**
         * Get dispatcher account.
         */
        const { data: dispatcher, error: dispatcherError } = await supabase
          .from("users")
          .select(
            `
              id,
              email,
              display_name,
              role,
              is_active,
              avatar_url,
              preferred_terminal,
              preferred_bracket
            `,
          )
          .eq("id", user.id)
          .eq("role", "dispatcher")
          .maybeSingle();

        if (dispatcherError) {
          throw dispatcherError;
        }

        if (!dispatcher) {
          throw new Error(
            "The authenticated account is not registered as a dispatcher.",
          );
        }

        if (!dispatcher.is_active) {
          throw new Error("This dispatcher account is currently inactive.");
        }

        /**
         * Get active terminal assignment.
         */
        const { data: assignment, error: assignmentError } = await supabase
          .from("terminal_dispatchers")
          .select(
            `
              id,
              terminal_id,
              dispatcher_id,
              is_active
            `,
          )
          .eq("dispatcher_id", dispatcher.id)
          .eq("is_active", true)
          .maybeSingle();

        if (assignmentError) {
          throw assignmentError;
        }

        if (!assignment) {
          throw new Error(
            "No active terminal assignment was found for this dispatcher.",
          );
        }

        /**
         * Get assigned terminal.
         */
        const { data: terminal, error: terminalError } = await supabase
          .from("terminals")
          .select(
            `
              id,
              terminal_number,
              name,
              location,
              description,
              bracket_number,
              is_active,
              operating_start,
              operating_end
            `,
          )
          .eq("id", assignment.terminal_id)
          .eq("is_active", true)
          .single();

        if (terminalError) {
          throw terminalError;
        }

        if (!terminal) {
          throw new Error("The assigned terminal could not be found.");
        }

        /**
         * jeepneys.terminal_id is the terminal NUMBER,
         * not terminals.id.
         */
        const { data: jeepneyRows, error: jeepneysError } = await supabase
          .from("jeepneys")
          .select("*")
          .eq("terminal_id", terminal.terminal_number)
          .order("queue_position", {
            ascending: true,
            nullsFirst: false,
          });

        if (jeepneysError) {
          throw jeepneysError;
        }

        /**
         * Normalize jeepneys.
         */
        let jeepneys: Jeepney[] = (jeepneyRows ?? []).map((jeepney: any) => ({
          ...jeepney,

          bracket: jeepney.bracket ?? terminal.bracket_number,

          front_count: Math.max(0, Number(jeepney.front_count ?? 0)),

          rear_count: Math.max(0, Number(jeepney.rear_count ?? 0)),

          occupancy_updated_at: jeepney.occupancy_updated_at ?? null,
        }));

        /**
         * Load latest door counts.
         */
        const doorMap = await fetchDoorCounts(
          jeepneys.map((jeepney) => jeepney.id),
        );

        jeepneys = applyDoorCounts(jeepneys, doorMap);

        /**
         * Sort queue position.
         */
        const sortedJeepneys = [...jeepneys].sort((a, b) => {
          const aPosition = a.queue_position ?? Number.MAX_SAFE_INTEGER;

          const bPosition = b.queue_position ?? Number.MAX_SAFE_INTEGER;

          return aPosition - bPosition;
        });

        /**
         * Apply operating-hours rule.
         */
        const displayJeepneys = applyOperatingHours(sortedJeepneys);

        /**
         * Only waiting/loading jeepneys
         * belong to the dispatch queue.
         */
        const queue = displayJeepneys.filter((jeepney) => {
          const status = jeepney.status?.toLowerCase();

          return status === "waiting" || status === "loading";
        });

        const nextToDispatch = queue.length > 0 ? queue[0] : null;

        const stats = calculateStats(displayJeepneys, queue.length);

        setIsOperatingHours(isWithinOperatingHours());

        setState({
          dispatcher,
          terminal,
          assignment,

          jeepneys: displayJeepneys,

          queue,

          nextToDispatch,

          // Kept compatible with your current hook.
          tripLogs: [],

          stats,

          loading: false,
          refreshing: false,
          error: null,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load dispatcher dashboard.";

        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: message,
        }));
      }
    },
    [applyDoorCounts, applyOperatingHours, fetchDoorCounts],
  );

  /**
   * Manual refresh.
   */
  const refresh = useCallback(async () => {
    await loadDashboard(true);
  }, [loadDashboard]);

  /**
   * Initial load.
   */
  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  /**
   * Operating-hours watcher.
   *
   * Checks once per minute.
   *
   * When the app crosses:
   * 5:00 AM
   * or
   * 9:00 PM
   *
   * the dashboard reloads and recalculates
   * its local display state.
   */
  useEffect(() => {
    const checkOperatingHours = () => {
      const currentlyOperating = isWithinOperatingHours();

      setIsOperatingHours((previous) => {
        if (previous !== currentlyOperating) {
          void loadDashboard();
        }

        return currentlyOperating;
      });
    };

    checkOperatingHours();

    const interval = setInterval(checkOperatingHours, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, [loadDashboard]);

  /**
   * Supabase Realtime.
   *
   * Listens to:
   *
   * jeepneys
   * door_counts
   * trips
   */
  useEffect(() => {
    const terminalNumber = state.terminal?.terminal_number;

    if (!terminalNumber) {
      return;
    }

    const instanceId = ++realtimeInstanceRef.current;

    let cancelled = false;

    /**
     * Remove previous channel.
     */
    if (realtimeChannelRef.current) {
      const previousChannel = realtimeChannelRef.current;

      realtimeChannelRef.current = null;

      void supabase.removeChannel(previousChannel);
    }

    const channel = supabase
      .channel(`dispatcher-dashboard-${terminalNumber}-${instanceId}`)

      /**
       * Jeepney realtime.
       */
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jeepneys",
          filter: `terminal_id=eq.${terminalNumber}`,
        },
        () => {
          if (cancelled) {
            return;
          }

          void loadDashboard();
        },
      )

      /**
       * Door-count INSERT.
       *
       * Used when a new door-count record
       * is created for a jeepney.
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

          setState((current) => {
            const exists = current.jeepneys.some(
              (jeepney) => jeepney.id === row.jeepney_id,
            );

            if (!exists) {
              return current;
            }

            const updatedJeepneys = current.jeepneys.map((jeepney) =>
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
            );

            const updatedQueue = updatedJeepneys.filter((jeepney) => {
              const status = jeepney.status?.toLowerCase();

              return status === "waiting" || status === "loading";
            });

            return {
              ...current,

              jeepneys: updatedJeepneys,

              queue: updatedQueue,

              nextToDispatch: updatedQueue.length > 0 ? updatedQueue[0] : null,
            };
          });
        },
      )

      /**
       * Door-count UPDATE.
       *
       * This is the main live occupancy path.
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

          setState((current) => {
            const updatedJeepneys = current.jeepneys.map((jeepney) =>
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
            );

            const updatedQueue = updatedJeepneys.filter((jeepney) => {
              const status = jeepney.status?.toLowerCase();

              return status === "waiting" || status === "loading";
            });

            return {
              ...current,

              jeepneys: updatedJeepneys,

              queue: updatedQueue,

              nextToDispatch: updatedQueue.length > 0 ? updatedQueue[0] : null,
            };
          });
        },
      )

      /**
       * Trip realtime.
       *
       * Refreshes dashboard state when
       * trip records change.
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

          void loadDashboard();
        },
      )

      .subscribe((status, error) => {
        if (cancelled) {
          return;
        }

        console.log("📡 Dispatcher dashboard realtime:", status);

        if (status === "SUBSCRIBED") {
          console.log("✅ Dispatcher dashboard realtime connected");
        }

        if (status === "CHANNEL_ERROR") {
          console.error("❌ Dispatcher dashboard realtime error:", error);
        }

        if (status === "TIMED_OUT") {
          console.error("⏱️ Dispatcher dashboard realtime timed out:", error);
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      cancelled = true;

      if (realtimeChannelRef.current === channel) {
        realtimeChannelRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [state.terminal?.terminal_number, loadDashboard]);

  /**
   * Notify next driver.
   */
  const notifyNextDriver = useCallback(async () => {
    /**
     * Don't notify/dispatch outside
     * operating hours.
     */
    if (!isWithinOperatingHours()) {
      throw new Error(getOutsideHoursMessage());
    }

    if (!state.nextToDispatch) {
      throw new Error("There is no jeepney waiting for dispatch.");
    }

    const jeepney = state.nextToDispatch;

    const driver = await getDriverForJeepney(jeepney.id);

    if (!driver) {
      throw new Error("No active driver is assigned to this jeepney.");
    }

    if (!driver.expo_push_token && !driver.fcm_token) {
      throw new Error(
        "The assigned driver does not have a push notification token.",
      );
    }

    const title = "Ready for Dispatch";

    const message = `${jeepney.plate_number ?? "Jeepney"} is next in the queue at ${
      state.terminal?.name ?? "your terminal"
    }.`;

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: driver.id,
        title,
        message,
        type: "dispatch",
        data: {
          jeepney_id: jeepney.id,

          terminal_id: state.terminal?.id ?? null,

          terminal_number: state.terminal?.terminal_number ?? null,

          bracket_number: state.terminal?.bracket_number ?? null,
        },
      });

    if (notificationError) {
      throw notificationError;
    }

    return true;
  }, [state.nextToDispatch, state.terminal]);

  return {
    dispatcher: state.dispatcher,

    terminal: state.terminal,

    assignment: state.assignment,

    terminalId: state.terminal?.id ?? null,

    terminalName: state.terminal?.name ?? "Unassigned Terminal",

    terminalNumber: state.terminal?.terminal_number ?? null,

    bracketNumber: state.terminal?.bracket_number ?? null,

    terminalLocation: state.terminal?.location ?? null,

    jeepneys: state.jeepneys,

    queue: state.queue,

    nextToDispatch: state.nextToDispatch,

    tripLogs: state.tripLogs,

    stats: state.stats,

    loading: state.loading,

    refreshing: state.refreshing,

    error: state.error,

    /**
     * New service-hours values.
     */
    isOperatingHours,

    operatingHoursMessage: isOperatingHours ? "" : getOutsideHoursMessage(),

    refresh,

    notifyNextDriver,
  };
}

/**
 * Calculate dashboard statistics.
 *
 * Outside operating hours, live statuses have already
 * been converted to "inactive" locally by
 * applyOperatingHours().
 */
function calculateStats(
  jeepneys: Jeepney[],
  queueCount: number,
): DashboardStats {
  let online = 0;
  let waiting = 0;
  let loading = 0;
  let enRoute = 0;
  let inactive = 0;

  jeepneys.forEach((jeepney) => {
    const status = jeepney.status?.toLowerCase();

    switch (status) {
      case "waiting":
        waiting += 1;
        online += 1;
        break;

      case "loading":
        loading += 1;
        online += 1;
        break;

      case "en_route":
      case "dispatched":
        enRoute += 1;
        online += 1;
        break;

      case "arrived":
        online += 1;
        break;

      case "inactive":
        inactive += 1;
        break;

      default:
        inactive += 1;
        break;
    }
  });

  return {
    total: jeepneys.length,
    online,
    waiting,
    loading,
    enRoute,
    inactive,
    queue: queueCount,
  };
}

/**
 * Get the active driver assigned to a jeepney.
 */
async function getDriverForJeepney(jeepneyId: string) {
  const { data, error } = await supabase
    .from("users")
    .select(
      `
        id,
        display_name,
        expo_push_token,
        fcm_token
      `,
    )
    .eq("jeepney_id", jeepneyId)
    .eq("role", "driver")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
