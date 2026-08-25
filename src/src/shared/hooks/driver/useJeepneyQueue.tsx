import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "../../config/supabase";
import { useAuthStore } from "../../store/authStore";

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

interface UseDriverQueueResult {
  jeepneys: QueueJeepney[];
  recentTrips: RecentTrip[];
  sections: QueueTerminalSection[];

  myJeepneyId: string | null;

  waitingCount: number;
  loadingCount: number;
  totalCount: number;

  loading: boolean;
  refreshing: boolean;
  error: string | null;

  refresh: () => Promise<void>;
}

const TERMINAL_NAMES = {
  1: { name: "Donsol", subtitle: "Terminal 1" },
  2: { name: "Daraga", subtitle: "Terminal 2" },
} as const;

export function useDriverQueue(): UseDriverQueueResult {
  const user = useAuthStore((state) => state.user);
  const myJeepneyId = user?.jeepneyId ?? null;

  const [jeepneys, setJeepneys] = useState<QueueJeepney[]>([]);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchQueue = useCallback(async () => {
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
      .order("terminal_id", { ascending: true, nullsLast: true })
      .order("bracket", { ascending: true })
      .order("queue_position", { ascending: true, nullsLast: true });

    if (queueError) throw queueError;

    setJeepneys((data ?? []) as QueueJeepney[]);
  }, []);

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
      .order("departure_time", { ascending: false })
      .limit(8);

    if (tripsError) throw tripsError;

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

  const fetchAll = useCallback(async () => {
    setError(null);

    try {
      await Promise.all([fetchQueue(), fetchRecentTrips()]);
    } catch (err: any) {
      console.error("Failed to load driver queue:", err);
      setError(err?.message || "Unable to load the queue. Please try again.");
    }
  }, [fetchQueue, fetchRecentTrips]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) return;
      setLoading(true);
      try {
        await fetchAll();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [fetchAll]);

  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    const channel = supabase
      .channel("driver-queue-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jeepneys" },
        () => fetchQueue(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        () => fetchRecentTrips(),
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [fetchQueue, fetchRecentTrips]);

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

  const waitingCount = useMemo(
    () => jeepneys.filter((item) => item.status === "waiting").length,
    [jeepneys],
  );

  const loadingCount = useMemo(
    () => jeepneys.filter((item) => item.status === "loading").length,
    [jeepneys],
  );

  return {
    jeepneys,
    recentTrips,
    sections,
    myJeepneyId,
    waitingCount,
    loadingCount,
    totalCount: jeepneys.length,
    loading,
    refreshing,
    error,
    refresh,
  };
}
