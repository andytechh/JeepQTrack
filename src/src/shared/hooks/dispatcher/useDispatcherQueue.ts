import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/src/shared/config/supabase";
import { useAuthStore } from "@/src/shared/store/authStore";

export interface DispatcherTerminal {
  id: string;
  terminal_number: number;
  name: string;
  location: string | null;
  description: string | null;
  bracket_number: number;
  is_active: boolean;
}

export interface QueueJeepney {
  id: string;
  plate_number: string;
  driver_name: string | null;
  driver_id: string | null;
  jeep_name: string | null;

  status: "waiting" | "loading";

  queue_position: number | null;

  current_occupancy: number;
  capacity: number;

  loading_started_at: string | null;
  loading_ends_at: string | null;
  entered_geofence_at: string | null;

  is_my_terminal: boolean;

  assigned_terminal_id: string;
  assigned_terminal_number: number;
  assigned_terminal_name: string;
  assigned_bracket_number: number;
}

export interface RecentTrip {
  id: string;
  jeepney_id: string;
  plate_number: string;
  driver_name: string | null;
  route: string;
  started_at: string;
}

export interface DispatcherQueueStats {
  myTerminal: number;
  waiting: number;
  loading: number;
  otherTerminal: number;
}

interface TerminalJeepneyRow {
  jeepney_id: string;
  terminal_id: string;
  is_active: boolean;
  terminals:
    | {
        id: string;
        terminal_number: number;
        name: string;
        location: string | null;
        description: string | null;
        bracket_number: number;
        is_active: boolean;
      }
    | {
        id: string;
        terminal_number: number;
        name: string;
        location: string | null;
        description: string | null;
        bracket_number: number;
        is_active: boolean;
      }[]
    | null;
}

const normalizeTerminal = (
  value: TerminalJeepneyRow["terminals"],
): DispatcherTerminal | null => {
  const terminal = Array.isArray(value) ? value[0] : value;

  if (!terminal) {
    return null;
  }

  return {
    id: terminal.id,
    terminal_number: Number(terminal.terminal_number),
    name: terminal.name,
    location: terminal.location ?? null,
    description: terminal.description ?? null,
    bracket_number: Number(terminal.bracket_number),
    is_active: Boolean(terminal.is_active),
  };
};

export function useDispatcherQueue() {
  const { user } = useAuthStore();

  const dispatcherId = user?.id ?? null;

  const [myTerminal, setMyTerminal] = useState<DispatcherTerminal | null>(null);

  const [queue, setQueue] = useState<QueueJeepney[]>([]);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fetchMyTerminal = useCallback(async () => {
    if (!dispatcherId) {
      setMyTerminal(null);
      return null;
    }

    const { data, error: terminalError } = await supabase
      .from("terminal_dispatchers")
      .select(
        `
          terminal_id,
          terminals:terminal_id (
            id,
            terminal_number,
            name,
            location,
            description,
            bracket_number,
            is_active
          )
        `,
      )
      .eq("dispatcher_id", dispatcherId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (terminalError) {
      console.error(
        "Failed to load dispatcher terminal:",
        terminalError.message,
      );

      setMyTerminal(null);

      return null;
    }

    if (!data) {
      setMyTerminal(null);
      return null;
    }

    const terminal = normalizeTerminal({
      jeepney_id: "",
      terminal_id: data.terminal_id,
      is_active: true,
      terminals: data.terminals as TerminalJeepneyRow["terminals"],
    });

    setMyTerminal(terminal);

    return terminal;
  }, [dispatcherId]);

  const fetchQueue = useCallback(async () => {
    const { data: jeepneyData, error: jeepneyError } = await supabase
      .from("jeepneys")
      .select(
        `
          id,
          plate_number,
          driver_name,
          driver_id,
          jeep_name,
          status,
          queue_position,
          current_occupancy,
          capacity,
          loading_started_at,
          loading_ends_at,
          entered_geofence_at
        `,
      )
      .in("status", ["waiting", "loading"]);

    if (jeepneyError) {
      console.error("Failed to load jeepney queue:", jeepneyError.message);

      setError(jeepneyError.message);
      setQueue([]);

      return;
    }

    const jeepneys = jeepneyData ?? [];

    if (jeepneys.length === 0) {
      setQueue([]);
      setError(null);
      return;
    }

    const jeepneyIds = jeepneys.map((jeepney) => jeepney.id);

    const { data: assignments, error: assignmentError } = await supabase
      .from("terminal_jeepneys")
      .select(
        `
            jeepney_id,
            terminal_id,
            is_active,
            terminals:terminal_id (
              id,
              terminal_number,
              name,
              location,
              description,
              bracket_number,
              is_active
            )
          `,
      )
      .in("jeepney_id", jeepneyIds)
      .eq("is_active", true);

    if (assignmentError) {
      console.error(
        "Failed to load terminal assignments:",
        assignmentError.message,
      );

      setError(assignmentError.message);
      setQueue([]);

      return;
    }

    const assignmentMap = new Map<string, DispatcherTerminal>();

    (assignments as TerminalJeepneyRow[] | null)?.forEach((assignment) => {
      const terminal = normalizeTerminal(assignment.terminals);

      if (terminal) {
        assignmentMap.set(assignment.jeepney_id, terminal);
      }
    });

    const normalizedQueue: QueueJeepney[] = [];

    jeepneys.forEach((jeepney: any) => {
      const terminal = assignmentMap.get(jeepney.id);

      if (!terminal) {
        return;
      }

      normalizedQueue.push({
        id: jeepney.id,
        plate_number: jeepney.plate_number,
        driver_name: jeepney.driver_name ?? null,
        driver_id: jeepney.driver_id ?? null,
        jeep_name: jeepney.jeep_name ?? null,

        status: jeepney.status,

        queue_position:
          jeepney.queue_position !== null
            ? Number(jeepney.queue_position)
            : null,

        current_occupancy: Number(jeepney.current_occupancy ?? 0),

        capacity: Number(jeepney.capacity ?? 0),

        loading_started_at: jeepney.loading_started_at ?? null,

        loading_ends_at: jeepney.loading_ends_at ?? null,

        entered_geofence_at: jeepney.entered_geofence_at ?? null,

        is_my_terminal: myTerminal?.id === terminal.id,

        assigned_terminal_id: terminal.id,

        assigned_terminal_number: terminal.terminal_number,

        assigned_terminal_name: terminal.name,

        assigned_bracket_number: terminal.bracket_number,
      });
    });

    normalizedQueue.sort((a, b) => {
      const terminalDifference =
        a.assigned_terminal_number - b.assigned_terminal_number;

      if (terminalDifference !== 0) {
        return terminalDifference;
      }

      const bracketDifference =
        a.assigned_bracket_number - b.assigned_bracket_number;

      if (bracketDifference !== 0) {
        return bracketDifference;
      }

      const aPosition = a.queue_position ?? 999999;
      const bPosition = b.queue_position ?? 999999;

      return aPosition - bPosition;
    });

    setQueue(normalizedQueue);
    setError(null);
  }, [myTerminal]);

  const fetchRecentTrips = useCallback(async () => {
    const { data, error: tripsError } = await supabase
      .from("trips")
      .select(
        `
          id,
          jeepney_id,
          route,
          started_at,
          jeepneys:jeepney_id (
            plate_number,
            driver_name
          )
        `,
      )
      .order("started_at", { ascending: false })
      .limit(8);

    if (tripsError) {
      console.error("Failed to load recent trips:", tripsError.message);

      setRecentTrips([]);

      return;
    }

    const trips: RecentTrip[] = (data ?? []).map((trip: any) => {
      const jeepney = Array.isArray(trip.jeepneys)
        ? trip.jeepneys[0]
        : trip.jeepneys;

      return {
        id: trip.id,
        jeepney_id: trip.jeepney_id,
        plate_number: jeepney?.plate_number ?? "Unknown",
        driver_name: jeepney?.driver_name ?? null,
        route: trip.route ?? "—",
        started_at: trip.started_at,
      };
    });

    setRecentTrips(trips);
  }, []);

  const loadAll = useCallback(async () => {
    setError(null);

    const terminal = await fetchMyTerminal();

    if (!terminal) {
      setQueue([]);
      await fetchRecentTrips();
      return;
    }

    await Promise.all([fetchQueue(), fetchRecentTrips()]);
  }, [fetchMyTerminal, fetchQueue, fetchRecentTrips]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      setLoading(true);

      try {
        await fetchMyTerminal();

        if (!mounted) return;

        await Promise.all([fetchQueue(), fetchRecentTrips()]);
      } catch (err) {
        console.error("Failed to initialize dispatcher queue:", err);
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
  }, [fetchMyTerminal, fetchQueue, fetchRecentTrips]);

  useEffect(() => {
    const channel = supabase
      .channel("dispatcher-queue-realtime")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jeepneys",
        },
        () => {
          fetchQueue();
        },
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "terminal_jeepneys",
        },
        () => {
          fetchQueue();
        },
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "terminal_dispatchers",
        },
        () => {
          fetchMyTerminal().then(() => {
            fetchQueue();
          });
        },
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trips",
        },
        () => {
          fetchRecentTrips();
        },
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trips",
        },
        () => {
          fetchRecentTrips();
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQueue, fetchRecentTrips, fetchMyTerminal]);

  const myTerminalQueue = useMemo(() => {
    if (!myTerminal) {
      return [];
    }

    return queue.filter((item) => item.assigned_terminal_id === myTerminal.id);
  }, [queue, myTerminal]);

  const otherTerminalQueue = useMemo(() => {
    if (!myTerminal) {
      return queue;
    }

    return queue.filter((item) => item.assigned_terminal_id !== myTerminal.id);
  }, [queue, myTerminal]);

  const stats = useMemo<DispatcherQueueStats>(() => {
    const waiting = queue.filter((item) => item.status === "waiting").length;

    const loading = queue.filter((item) => item.status === "loading").length;

    return {
      myTerminal: myTerminalQueue.length,
      waiting,
      loading,
      otherTerminal: otherTerminalQueue.length,
    };
  }, [queue, myTerminalQueue, otherTerminalQueue]);

  const canAlertJeepney = useCallback(
    (item: QueueJeepney) => {
      if (!myTerminal) {
        return false;
      }

      return item.is_my_terminal && item.assigned_terminal_id === myTerminal.id;
    },
    [myTerminal],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await fetchMyTerminal();

      await Promise.all([fetchQueue(), fetchRecentTrips()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchMyTerminal, fetchQueue, fetchRecentTrips]);

  return {
    myTerminal,

    queue,
    myTerminalQueue,
    otherTerminalQueue,

    recentTrips,

    stats,

    loading,
    refreshing,
    error,

    canAlertJeepney,

    refresh,

    fetchQueue,
    fetchRecentTrips,
    fetchMyTerminal,
    loadAll,
  };
}
