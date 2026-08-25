import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "../../config/supabase";
import { useAuthStore } from "../../store/authStore";

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

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}

export function useDriverDashboard() {
  const user = useAuthStore((state) => state.user);
  const jeepneyId = user?.jeepneyId ?? null;
  const driverId = user?.uid ?? null;

  const [myJeepney, setMyJeepney] = useState<DriverJeepney | null>(null);
  const [queueJeepneys, setQueueJeepneys] = useState<DriverJeepney[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!driverId) {
      setLoading(false);
      return;
    }

    setError(null);

    try {
      // 1. My own jeepney row.
      // Prefer the users.jeepney_id link (direct PK lookup);
      // fall back to jeepneys.driver_id in case it isn't set yet.
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

      // 2. Rest of the terminal queue, so we can show "3 jeeps ahead of you"
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

      // 3. Notifications addressed to this driver (notifications.user_id)
      const { data: notifs, error: notifError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", driverId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (notifError) throw notifError;
      setNotifications((notifs ?? []) as NotificationItem[]);

      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message ?? "Unable to load your dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverId, jeepneyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: any change to jeepneys (queue reshuffles affect everyone),
  // scoped refetch keeps it simple and correct.
  useEffect(() => {
    if (!driverId) return;

    const channel = supabase
      .channel(`driver-dashboard-${driverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jeepneys" },
        () => fetchData(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${driverId}`,
        },
        () => fetchData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, fetchData]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const aheadOfMe = useMemo(() => {
    if (!myJeepney?.queue_position) return 0;
    return Math.max(0, myJeepney.queue_position - 1);
  }, [myJeepney]);

  const isNextInLine = myJeepney?.queue_position === 1;
  const isLoadingNow = myJeepney?.status === "loading";
  const isDispatchedOrEnRoute =
    myJeepney?.status === "dispatched" || myJeepney?.status === "en_route";

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return {
    myJeepney,
    queueJeepneys,
    totalInQueue: queueJeepneys.length,
    aheadOfMe,
    isNextInLine,
    isLoadingNow,
    isDispatchedOrEnRoute,
    notifications,
    unreadNotificationCount,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
  };
}
