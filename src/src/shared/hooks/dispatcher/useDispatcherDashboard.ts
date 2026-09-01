import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../config/supabase";

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
  driver_name: string | null;
  driver_id: string | null;
  queue_position: number | null;
  terminal_id: number | null;
  bracket: number | null;
  last_location_update: string | null;
  [key: string]: any;
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

  const loadDashboard = useCallback(async (isRefresh = false) => {
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

      // jeepneys.terminal_id is the terminal's integer NUMBER (1 or 2),
      // not the terminals.id uuid — match against terminal_number.
      const { data: jeepneyRows, error: jeepneysError } = await supabase
        .from("jeepneys")
        .select("*")
        .eq("terminal_id", terminal.terminal_number)
        .order("queue_position", { ascending: true, nullsFirst: false });

      if (jeepneysError) {
        throw jeepneysError;
      }

      const jeepneys: Jeepney[] = (jeepneyRows ?? []).map((jeepney: any) => ({
        ...jeepney,
        bracket: jeepney.bracket ?? terminal.bracket_number,
      }));

      const sortedJeepneys = [...jeepneys].sort((a, b) => {
        const aPosition = a.queue_position ?? Number.MAX_SAFE_INTEGER;
        const bPosition = b.queue_position ?? Number.MAX_SAFE_INTEGER;
        return aPosition - bPosition;
      });

      const queue = sortedJeepneys.filter((jeepney) => {
        const status = jeepney.status?.toLowerCase();
        return status === "waiting" || status === "loading";
      });

      const nextToDispatch = queue.length > 0 ? queue[0] : null;

      const stats = calculateStats(sortedJeepneys, queue.length);

      setState({
        dispatcher,
        terminal,
        assignment,
        jeepneys: sortedJeepneys,
        queue,
        nextToDispatch,
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
  }, []);

  const refresh = useCallback(async () => {
    await loadDashboard(true);
  }, [loadDashboard]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Subscribe directly to jeepneys for this terminal — no more
  // terminal_jeepneys join table in the loop.
  useEffect(() => {
    const terminalNumber = state.terminal?.terminal_number;

    if (!terminalNumber) {
      return;
    }

    const jeepneysChannel = supabase
      .channel(`dispatcher-jeepneys-${terminalNumber}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jeepneys",
          filter: `terminal_id=eq.${terminalNumber}`,
        },
        () => {
          loadDashboard();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jeepneysChannel);
    };
  }, [state.terminal?.terminal_number, loadDashboard]);

  const notifyNextDriver = useCallback(async () => {
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

    refresh,

    notifyNextDriver,
  };
}

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
