import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../config/supabase";

export type NotificationType =
  "arrival" | "dispatch" | "occupancy" | "eta" | "status" | "queue" | "system";

export interface AppNotification {
  id: string;
  user_id: string | null;
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

const COMMUTER_TYPES: NotificationType[] = [
  "arrival",
  "dispatch",
  "occupancy",
  "eta",
  "status",
  "queue",
  "system",
];

const MAX_NOTIFICATIONS = 30;

export function useNotifications(
  userId?: string | null,
): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const mountedRef = useRef(true);

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const isCommuterType = useCallback((type: unknown) => {
    return (
      typeof type === "string" &&
      COMMUTER_TYPES.includes(type as NotificationType)
    );
  }, []);

  const loadNotifications = useCallback(
    async (isRefresh = false) => {
      if (!userId) {
        if (!mountedRef.current) {
          return;
        }

        setNotifications([]);
        setLoading(false);
        setRefreshing(false);
        setError(null);

        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        console.log("🔔 Loading commuter notifications:", userId);

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
          .or(`user_id.eq.${userId},user_id.is.null`)
          .in("type", COMMUTER_TYPES)
          .neq("type", "chat")
          .order("created_at", {
            ascending: false,
          })
          .limit(MAX_NOTIFICATIONS);

        console.log("🔎 RAW NOTIFICATIONS:", data);
        console.log("🔎 RAW NOTIFICATION ERROR:", fetchError);

        if (fetchError) {
          console.error("❌ Commuter notification query failed:", fetchError);

          if (mountedRef.current) {
            setError(fetchError.message);
            setNotifications([]);
          }

          return;
        }

        const rows = (data ?? []).filter((row) =>
          isCommuterType(row.type),
        ) as AppNotification[];

        console.log("📊 Commuter notifications returned:", rows.length);

        if (mountedRef.current) {
          setNotifications(rows);
        }
      } catch (err: any) {
        console.error("❌ Commuter notification loading error:", err);

        if (mountedRef.current) {
          setError(err?.message ?? "Unable to load commuter notifications.");

          setNotifications([]);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [userId, isCommuterType],
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);

      return;
    }

    let cancelled = false;

    const setupRealtime = async () => {
      await loadNotifications(false);

      if (cancelled) {
        return;
      }

      if (channelRef.current) {
        console.log("📡 Removing existing commuter notification channel");

        await supabase.removeChannel(channelRef.current);

        channelRef.current = null;
      }

      if (cancelled) {
        return;
      }

      const channelName = `commuter-notifications-${userId}`;

      console.log("📡 Creating commuter channel:", channelName);

      const channel = supabase.channel(channelName);

      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
          },
          (payload) => {
            if (cancelled) {
              return;
            }

            const incoming = payload.new as AppNotification;

            if (!isCommuterType(incoming.type)) {
              return;
            }

            if (incoming.user_id !== null && incoming.user_id !== userId) {
              return;
            }

            console.log("🔔 NEW COMMUTER NOTIFICATION:", incoming.title);

            setNotifications((current) => {
              const exists = current.some((item) => item.id === incoming.id);

              if (exists) {
                return current;
              }

              return [incoming, ...current]
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime(),
                )
                .slice(0, MAX_NOTIFICATIONS);
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
          },
          (payload) => {
            if (cancelled) {
              return;
            }

            const updated = payload.new as AppNotification;

            if (!isCommuterType(updated.type)) {
              return;
            }

            if (updated.user_id !== null && updated.user_id !== userId) {
              return;
            }

            setNotifications((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
          },
          (payload) => {
            if (cancelled) {
              return;
            }

            const deleted = payload.old as Partial<AppNotification>;

            if (!deleted.id) {
              return;
            }

            setNotifications((current) =>
              current.filter((item) => item.id !== deleted.id),
            );
          },
        );

      if (cancelled) {
        await supabase.removeChannel(channel);
        return;
      }

      channelRef.current = channel;

      channel.subscribe((status) => {
        if (cancelled) {
          return;
        }

        console.log("📡 Commuter notification realtime:", status);

        if (status === "SUBSCRIBED") {
          console.log("✅ Commuter notification realtime connected");
        }

        if (status === "CHANNEL_ERROR") {
          console.error("❌ Commuter notification realtime CHANNEL_ERROR");
        }

        if (status === "TIMED_OUT") {
          console.error("⏱️ Commuter notification realtime TIMED_OUT");
        }
      });
    };

    setupRealtime();

    return () => {
      cancelled = true;

      const channel = channelRef.current;

      channelRef.current = null;

      if (channel) {
        console.log("📡 Cleaning commuter notification channel");

        supabase.removeChannel(channel);
      }
    };
  }, [userId, loadNotifications, isCommuterType]);

  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!userId) {
        return false;
      }

      const previous = notifications;

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
          .or(`user_id.eq.${userId},user_id.is.null`)
          .neq("type", "chat");

        if (updateError) {
          console.error("❌ Mark notification read failed:", updateError);

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

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!userId || unreadCount === 0) {
      return true;
    }

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
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq("read", false)
        .in("type", COMMUTER_TYPES)
        .neq("type", "chat");

      if (updateError) {
        console.error(
          "❌ Mark all commuter notifications failed:",
          updateError,
        );

        setNotifications(previous);

        return false;
      }

      return true;
    } catch (err) {
      console.error("❌ Mark all commuter notifications exception:", err);

      setNotifications(previous);

      return false;
    }
  }, [notifications, unreadCount, userId]);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId),
    );
  }, []);

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
