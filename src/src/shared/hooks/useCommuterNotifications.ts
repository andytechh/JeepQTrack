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

interface NotificationRead {
  notification_id: string;
  user_id: string;
  read_at: string;
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

export function useCommuterNotifications(
  userId?: string | null,
): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);

  const instanceIdRef = useRef(
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const isCommuterType = useCallback((type: unknown) => {
    return (
      typeof type === "string" &&
      COMMUTER_TYPES.includes(type as NotificationType)
    );
  }, []);

  const applyReadState = useCallback(
    (rows: AppNotification[], reads: NotificationRead[]): AppNotification[] => {
      const readSet = new Set(
        reads
          .filter((item) => item.user_id === userId)
          .map((item) => item.notification_id),
      );

      return rows.map((notification) => {
        if (notification.user_id === null) {
          return {
            ...notification,
            read: readSet.has(notification.id),
          };
        }

        return notification;
      });
    },
    [userId],
  );

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
          .order("created_at", {
            ascending: false,
          })
          .limit(MAX_NOTIFICATIONS);

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

        const globalNotificationIds = rows
          .filter((row) => row.user_id === null)
          .map((row) => row.id);

        let reads: NotificationRead[] = [];

        if (globalNotificationIds.length > 0) {
          const { data: readData, error: readError } = await supabase
            .from("notification_reads")
            .select("notification_id, user_id, read_at")
            .eq("user_id", userId)
            .in("notification_id", globalNotificationIds);

          if (readError) {
            console.error(
              "❌ Commuter notification read-state query failed:",
              readError,
            );

            if (mountedRef.current) {
              setError(readError.message);
              setNotifications([]);
            }

            return;
          }

          reads = (readData ?? []) as NotificationRead[];
        }

        const finalRows = applyReadState(rows, reads);

        if (mountedRef.current) {
          setNotifications(finalRows);
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
    [applyReadState, isCommuterType, userId],
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

    let isActive = true;

    loadNotifications(false);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `commuter-notifications-${userId}-${instanceIdRef.current}`;

    const channel = supabase.channel(channelName);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        async (payload) => {
          if (!isActive || !mountedRef.current) {
            return;
          }

          const incoming = payload.new as AppNotification;

          if (!isCommuterType(incoming.type)) {
            return;
          }

          if (incoming.user_id !== null && incoming.user_id !== userId) {
            return;
          }

          let read = incoming.read;

          if (incoming.user_id === null) {
            const { data } = await supabase
              .from("notification_reads")
              .select("notification_id")
              .eq("notification_id", incoming.id)
              .eq("user_id", userId)
              .maybeSingle();

            read = !!data;
          }

          const notification: AppNotification = {
            ...incoming,
            read,
          };

          setNotifications((current) => {
            const exists = current.some((item) => item.id === notification.id);

            if (exists) {
              return current;
            }

            return [notification, ...current]
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
        async (payload) => {
          if (!isActive || !mountedRef.current) {
            return;
          }

          const updated = payload.new as AppNotification;

          if (!isCommuterType(updated.type)) {
            return;
          }

          if (updated.user_id !== null && updated.user_id !== userId) {
            return;
          }

          let read = updated.read;

          if (updated.user_id === null) {
            const { data } = await supabase
              .from("notification_reads")
              .select("notification_id")
              .eq("notification_id", updated.id)
              .eq("user_id", userId)
              .maybeSingle();

            read = !!data;
          }

          const notification: AppNotification = {
            ...updated,
            read,
          };

          setNotifications((current) => {
            const exists = current.some((item) => item.id === notification.id);

            if (!exists) {
              return [notification, ...current]
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime(),
                )
                .slice(0, MAX_NOTIFICATIONS);
            }

            return current.map((item) =>
              item.id === notification.id ? notification : item,
            );
          });
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
          if (!isActive || !mountedRef.current) {
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
      )
      .subscribe((status) => {
        if (!isActive) {
          return;
        }

        console.log("📡 Commuter notification realtime:", status);
      });

    channelRef.current = channel;

    return () => {
      isActive = false;

      const activeChannel = channelRef.current;

      channelRef.current = null;

      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [isCommuterType, loadNotifications, userId]);

  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!userId) {
        return false;
      }

      const notification = notifications.find(
        (item) => item.id === notificationId,
      );

      if (!notification) {
        return false;
      }

      const previous = notifications;

      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                read: true,
              }
            : item,
        ),
      );

      try {
        if (notification.user_id === null) {
          const { error: insertError } = await supabase
            .from("notification_reads")
            .upsert(
              {
                notification_id: notificationId,
                user_id: userId,
              },
              {
                onConflict: "notification_id,user_id",
              },
            );

          if (insertError) {
            console.error(
              "❌ Mark global commuter notification read failed:",
              insertError,
            );

            setNotifications(previous);

            return false;
          }

          return true;
        }

        const { error: updateError } = await supabase
          .from("notifications")
          .update({
            read: true,
          })
          .eq("id", notificationId)
          .eq("user_id", userId);

        if (updateError) {
          console.error(
            "❌ Mark commuter notification read failed:",
            updateError,
          );

          setNotifications(previous);

          return false;
        }

        return true;
      } catch (err) {
        console.error("❌ Mark commuter notification read exception:", err);

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
      const userSpecificIds = notifications
        .filter(
          (notification) =>
            !notification.read && notification.user_id === userId,
        )
        .map((notification) => notification.id);

      const globalIds = notifications
        .filter(
          (notification) => !notification.read && notification.user_id === null,
        )
        .map((notification) => notification.id);

      if (userSpecificIds.length > 0) {
        const { error: updateError } = await supabase
          .from("notifications")
          .update({
            read: true,
          })
          .eq("user_id", userId)
          .in("id", userSpecificIds);

        if (updateError) {
          console.error(
            "❌ Mark commuter-specific notifications failed:",
            updateError,
          );

          setNotifications(previous);

          return false;
        }
      }

      if (globalIds.length > 0) {
        const readRows = globalIds.map((notificationId) => ({
          notification_id: notificationId,
          user_id: userId,
        }));

        const { error: insertError } = await supabase
          .from("notification_reads")
          .upsert(readRows, {
            onConflict: "notification_id,user_id",
          });

        if (insertError) {
          console.error(
            "❌ Mark global commuter notifications failed:",
            insertError,
          );

          setNotifications(previous);

          return false;
        }
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

export const useNotifications = useCommuterNotifications;
