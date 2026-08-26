import { useCallback, useEffect, useMemo } from "react";

import { useState } from "react";
import { supabase } from "../../config/supabase";
import { useAuthStore } from "../../store/authStore";
import { useNotifications } from "../useNotification";

export interface DriverJeepney {
  id: string;
  plate_number: string;
  jeep_name: string | null;
  driver_name: string | null;
  bracket: number;
  capacity: number;
  status: string;
  current_occupancy: number;
  queue_position: number | null;
  terminal_id: number;
  loading_ends_at: string | null;
  departed_at: string | null;
  updated_at: string;
}

export function useDriverDashboard() {
  const user = useAuthStore((state) => state.user);
  const jeepneyId = user?.jeepneyId ?? null;
  const driverId = user?.uid ?? null;

  const [myJeepney, setMyJeepney] = useState<DriverJeepney | null>(null);
  const [queueJeepneys, setQueueJeepneys] = useState<DriverJeepney[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Single source of truth for notifications — same hook the
  // notifications screen uses, so read/unread state can never
  // drift between the two screens.
  const {
    notifications,
    unreadCount: unreadNotificationCount,
    loading: notificationsLoading,
    refreshing: notificationsRefreshing,
    refresh: refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications(driverId);

  const fetchJeepneyData = useCallback(async () => {
    if (!driverId) {
      setLoading(false);
      return;
    }

    setError(null);

    try {
      // 1. My own jeepney row.
      let mine: DriverJeepney | null = null;

      if (jeepneyId) {
        const { data, error: mineError } = await supabase
          .from("jeepneys")
          .select("*")
          .eq("id", jeepneyId)
          .maybeSingle();

        if (mineError) throw mineError;
        mine = data as DriverJeepney | null;
      } else {
        const { data, error: mineError } = await supabase
          .from("jeepneys")
          .select("*")
          .eq("driver_id", driverId)
          .maybeSingle();

        if (mineError) throw mineError;
        mine = data as DriverJeepney | null;
      }

      setMyJeepney(mine);

      // 2. Rest of the terminal queue.
      if (mine?.terminal_id) {
        const { data: terminalJeeps, error: terminalError } = await supabase
          .from("jeepneys")
          .select("*")
          .eq("terminal_id", mine.terminal_id)
          .in("status", ["waiting", "loading", "arrived"])
          .order("queue_position", { ascending: true, nullsFirst: false });

        if (terminalError) throw terminalError;
        setQueueJeepneys((terminalJeeps ?? []) as DriverJeepney[]);
      } else {
        setQueueJeepneys([]);
      }

      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message ?? "Unable to load your dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverId, jeepneyId]);

  useEffect(() => {
    fetchJeepneyData();
  }, [fetchJeepneyData]);

  // Realtime: only jeepneys now — notifications realtime is owned
  // entirely by useNotifications.
  useEffect(() => {
    if (!driverId) return;

    const channel = supabase
      .channel(`driver-dashboard-jeepneys-${driverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jeepneys" },
        () => fetchJeepneyData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, fetchJeepneyData]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchJeepneyData();
    refreshNotifications();
  }, [fetchJeepneyData, refreshNotifications]);

  const aheadOfMe = useMemo(() => {
    if (!myJeepney?.queue_position) return 0;
    return Math.max(0, myJeepney.queue_position - 1);
  }, [myJeepney]);

  const isNextInLine = myJeepney?.queue_position === 1;
  const isLoadingNow = myJeepney?.status === "loading";
  const isDispatchedOrEnRoute =
    myJeepney?.status === "dispatched" || myJeepney?.status === "en_route";

  return {
    driverId,
    myJeepney,
    queueJeepneys,
    totalInQueue: queueJeepneys.length,
    aheadOfMe,
    isNextInLine,
    isLoadingNow,
    isDispatchedOrEnRoute,
    notifications,
    unreadNotificationCount,
    loading: loading || notificationsLoading,
    refreshing: refreshing || notificationsRefreshing,
    error,
    lastUpdated,
    refresh,
    markAsRead,
    markAllAsRead,
  };
}
