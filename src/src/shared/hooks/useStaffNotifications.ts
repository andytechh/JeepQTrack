import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../config/supabase";

export type StaffNotificationType =
  | "arrival"
  | "dispatch"
  | "occupancy"
  | "eta"
  | "status"
  | "queue"
  | "system"
  | "chat";

export interface StaffNotification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: StaffNotificationType;
  read: boolean;
  data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

interface UseStaffNotificationsResult {
  notifications: StaffNotification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  removeNotification: (notificationId: string) => void;
}

const STAFF_NOTIFICATION_TYPES: StaffNotificationType[] = [
  "arrival",
  "dispatch",
  "occupancy",
  "eta",
  "status",
  "queue",
  "system",
  "chat",
];

const MAX_NOTIFICATIONS = 50;

export function useStaffNotifications(): UseStaffNotificationsResult {
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const mountedRef = useRef(true);

  /*
   * Each mounted hook instance gets its own Realtime topic.
   *
   * This is important because the notification badge and the
   * notification screen may both use this hook at the same time.
   */
  const instanceIdRef = useRef(
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const isStaffNotificationType = useCallback((type: unknown) => {
    return (
      typeof type === "string" &&
      STAFF_NOTIFICATION_TYPES.includes(type as StaffNotificationType)
    );
  }, []);

  /*
   * Get the currently authenticated staff user.
   *
   * We intentionally do not pass a role from the UI.
   * Driver / dispatcher / admin access should be enforced by
   * Supabase authentication + RLS rather than trusting the client.
   */
  const loadCurrentUser = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      throw new Error("No authenticated staff session.");
    }

    return user;
  }, []);

  const loadNotifications = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const user = await loadCurrentUser();

        if (!mountedRef.current) {
          return;
        }

        setUserId(user.id);

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
          /*
           * A staff notification may be:
           *
           * 1. specifically addressed to this staff member
           * 2. staff-wide with user_id = null
           *
           * RLS remains the actual security boundary.
           */
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .in("type", STAFF_NOTIFICATION_TYPES)
          .order("created_at", {
            ascending: false,
          })
          .limit(MAX_NOTIFICATIONS);

        if (fetchError) {
          console.error("❌ Staff notification query failed:", fetchError);

          if (mountedRef.current) {
            setError(fetchError.message);
            setNotifications([]);
          }

          return;
        }

        const rows = (data ?? []).filter((row) =>
          isStaffNotificationType(row.type),
        ) as StaffNotification[];

        if (mountedRef.current) {
          setNotifications(rows);
        }
      } catch (err: any) {
        console.error("❌ Staff notification loading error:", err);

        if (mountedRef.current) {
          setError(err?.message ?? "Unable to load staff notifications.");

          setNotifications([]);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [isStaffNotificationType, loadCurrentUser],
  );

  /*
   * Track component lifecycle.
   */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
   * Auth state.
   *
   * When the staff session changes, the notification hook will
   * reload using the new authenticated user.
   */
  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active || !mountedRef.current) {
          return;
        }

        setUserId(user?.id ?? null);

        if (!user) {
          setNotifications([]);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        console.error("❌ Staff auth lookup failed:", err);

        if (active && mountedRef.current) {
          setUserId(null);
          setNotifications([]);
          setLoading(false);
          setError("Unable to determine the staff session.");
        }
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || !mountedRef.current) {
        return;
      }

      const nextUserId = session?.user?.id ?? null;

      setUserId(nextUserId);

      if (!nextUserId) {
        setNotifications([]);
        setLoading(false);
        setRefreshing(false);
        setError(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * Initial fetch + Realtime subscription.
   *
   * Do NOT await loadNotifications() before creating the channel.
   * Your commuter hook already uses this pattern to avoid the
   * Supabase "cannot add postgres_changes callbacks after subscribe"
   * race.
   */
  useEffect(() => {
    let isActive = true;

    const setup = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !isActive) {
          return;
        }

        /*
         * Initial data load.
         *
         * We intentionally don't await it before creating the channel.
         */
        loadNotifications(false);

        /*
         * Remove any previous channel synchronously.
         */
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        const channelName = `staff-notifications-${user.id}-${instanceIdRef.current}`;

        console.log("📡 Creating staff notification channel:", channelName);

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
              if (!isActive || !mountedRef.current) {
                return;
              }

              const incoming = payload.new as StaffNotification;

              if (!isStaffNotificationType(incoming.type)) {
                return;
              }

              /*
               * Only accept:
               * - notifications addressed to this user
               * - staff-wide notifications
               */
              if (incoming.user_id !== null && incoming.user_id !== user.id) {
                return;
              }

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
              if (!isActive || !mountedRef.current) {
                return;
              }

              const updated = payload.new as StaffNotification;

              if (!isStaffNotificationType(updated.type)) {
                return;
              }

              if (updated.user_id !== null && updated.user_id !== user.id) {
                return;
              }

              setNotifications((current) => {
                const exists = current.some((item) => item.id === updated.id);

                if (!exists) {
                  return [updated, ...current]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime(),
                    )
                    .slice(0, MAX_NOTIFICATIONS);
                }

                return current.map((item) =>
                  item.id === updated.id ? updated : item,
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

              const deleted = payload.old as Partial<StaffNotification>;

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

            console.log("📡 Staff notification realtime:", status);

            if (status === "SUBSCRIBED") {
              console.log("✅ Staff notification realtime connected");
            }

            if (status === "CHANNEL_ERROR") {
              console.error("❌ Staff notification realtime CHANNEL_ERROR");
            }

            if (status === "TIMED_OUT") {
              console.error("⏱️ Staff notification realtime TIMED_OUT");
            }
          });

        channelRef.current = channel;
      } catch (err) {
        console.error("❌ Staff notification realtime setup failed:", err);
      }
    };

    setup();

    return () => {
      isActive = false;

      const activeChannel = channelRef.current;

      channelRef.current = null;

      if (activeChannel) {
        console.log("📡 Cleaning staff notification channel");

        supabase.removeChannel(activeChannel);
      }
    };
  }, [isStaffNotificationType, loadNotifications]);

  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!userId) {
        return false;
      }

      const previous = notifications;

      /*
       * Optimistic update.
       */
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
          .or(`user_id.eq.${userId},user_id.is.null`);

        if (updateError) {
          console.error("❌ Mark staff notification read failed:", updateError);

          setNotifications(previous);

          return false;
        }

        return true;
      } catch (err) {
        console.error("❌ Mark staff notification read exception:", err);

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

    /*
     * Optimistic update.
     */
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
        .in("type", STAFF_NOTIFICATION_TYPES);

      if (updateError) {
        console.error("❌ Mark all staff notifications failed:", updateError);

        setNotifications(previous);

        return false;
      }

      return true;
    } catch (err) {
      console.error("❌ Mark all staff notifications exception:", err);

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
