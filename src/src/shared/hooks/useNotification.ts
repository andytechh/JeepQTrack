import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../config/supabase";

export type NotificationType =
  | "arrival"
  | "dispatch"
  | "occupancy"
  | "eta"
  | "status"
  | "queue"
  | "system"
  | "chat";

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  removeNotification: (notificationId: string) => void;
}

export function useNotifications(
  userId?: string | null,
): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<any>(null);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const loadNotifications = useCallback(
    async (isRefresh = false) => {
      if (!userId) {
        setNotifications([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const { data, error: fetchError } = await supabase
          .from("notifications")
          .select(
            `
              id,
              user_id,
              title,
              message,
              type,
              read,
              data,
              created_at,
              updated_at
            `,
          )
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          });

        if (fetchError) {
          console.error("❌ Notifications fetch error:", fetchError);
          setError(fetchError.message);
          return;
        }

        setNotifications((data ?? []) as AppNotification[]);
      } catch (err: any) {
        console.error("❌ Notifications load error:", err);

        setError(err?.message || "Unable to load notifications.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId],
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return false;

      const previous = notifications;

      // Optimistic update.
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                read: true,
              }
            : notification,
        ),
      );

      try {
        const { error: updateError } = await supabase
          .from("notifications")
          .update({
            read: true,
          })
          .eq("id", notificationId)
          .eq("user_id", userId);

        if (updateError) {
          console.error("❌ Mark notification read error:", updateError);

          // Rollback.
          setNotifications(previous);

          return false;
        }

        return true;
      } catch (err) {
        console.error("❌ Mark notification read exception:", err);

        setNotifications(previous);

        return false;
      }
    },
    [notifications, userId],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return false;

    const previous = notifications;

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      })),
    );

    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({
          read: true,
        })
        .eq("user_id", userId)
        .eq("read", false);

      if (updateError) {
        console.error("❌ Mark all notifications read error:", updateError);

        setNotifications(previous);

        return false;
      }

      return true;
    } catch (err) {
      console.error("❌ Mark all notifications exception:", err);

      setNotifications(previous);

      return false;
    }
  }, [notifications, userId]);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId),
    );
  }, []);

  /*
   * Initial load.
   */
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /*
   * Supabase Realtime.
   */
  useEffect(() => {
    if (!userId) {
      return;
    }

    const channelName = `commuter-notifications-${userId}`;

    console.log("📡 Subscribing to notifications:", channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("🔔 New commuter notification:", payload.new);

          const incoming = payload.new as AppNotification;

          setNotifications((current) => {
            const alreadyExists = current.some(
              (item) => item.id === incoming.id,
            );

            if (alreadyExists) {
              return current;
            }

            return [incoming, ...current];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("🔄 Notification updated:", payload.new);

          const updated = payload.new as AppNotification;

          setNotifications((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
        },
      )
      .subscribe((status) => {
        console.log("📡 Notifications realtime:", status);
      });

    channelRef.current = channel;

    return () => {
      console.log("📡 Removing notification realtime channel");

      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    await loadNotifications(true);
  }, [loadNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    removeNotification,
  };
}
