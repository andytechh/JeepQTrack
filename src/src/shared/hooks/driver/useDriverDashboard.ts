import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../config/supabase";
import { useAuthStore } from "../../store/authStore";
import { useStaffNotifications } from "../useStaffNotifications";

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
  eta_at: string | null; // estimated arrival time once dispatched/en route
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

  // Single source of truth for notifications — the SAME hook the
  // Notifications screen uses. It resolves read/unread state for global
  // notifications via the notification_reads join table.
  //
  // Do NOT swap this for the old "commuter" useNotifications hook: that
  // hook checks the raw notifications.read column directly, which never
  // gets updated per-user for global notifications, so it always reports
  // them as unread — that mismatch was the cause of the stuck "9+" badge.
  const {
    notifications,
    unreadCount: unreadNotificationCount,
    loading: notificationsLoading,
    refreshing: notificationsRefreshing,
    refresh: refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useStaffNotifications();

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

  // Realtime: jeepneys only. Notification realtime is owned entirely by
  // useStaffNotifications.
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
