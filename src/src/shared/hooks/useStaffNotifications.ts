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

interface NotificationRead {
  notification_id: string;
  user_id: string;
  read_at: string;
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

  const mountedRef = useRef(true);
  const notificationChannelRef = useRef<ReturnType<
    typeof supabase.channel
  > | null>(null);
  const readChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );

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

  const getGlobalReadIds = useCallback(
    async (uid: string, notificationIds: string[]) => {
      if (notificationIds.length === 0) {
        return new Set<string>();
      }

      const { data, error: readError } = await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", uid)
        .in("notification_id", notificationIds);

      if (readError) {
        throw readError;
      }

      return new Set(
        (data ?? []).map(
          (row: { notification_id: string }) => row.notification_id,
        ),
      );
    },
    [],
  );

  const applyReadState = useCallback(
    (rows: StaffNotification[], readIds: Set<string>): StaffNotification[] => {
      return rows.map((notification) => {
        if (notification.user_id === null) {
          return {
            ...notification,
            read: readIds.has(notification.id),
          };
        }

        return notification;
      });
    },
    [],
  );

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
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .in("type", STAFF_NOTIFICATION_TYPES)
          .order("created_at", {
            ascending: false,
          })
          .limit(MAX_NOTIFICATIONS);

        if (fetchError) {
          throw fetchError;
        }

        const rows = (data ?? []).filter((row) =>
          isStaffNotificationType(row.type),
        ) as StaffNotification[];

        const globalIds = rows
          .filter((row) => row.user_id === null)
          .map((row) => row.id);

        const readIds = await getGlobalReadIds(user.id, globalIds);

        const finalRows = applyReadState(rows, readIds);

        if (mountedRef.current) {
          setNotifications(finalRows);
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
    [
      applyReadState,
      getGlobalReadIds,
      isStaffNotificationType,
      loadCurrentUser,
    ],
  );

  const refresh = useCallback(async () => {
    await loadNotifications(true);
  }, [loadNotifications]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active || !mountedRef.current) {
          return;
        }

        setUserId(user?.id ?? null);

        if (user) {
          await loadNotifications(false);
        } else {
          setNotifications([]);
          setLoading(false);
          setRefreshing(false);
          setError(null);
        }
      } catch (err: any) {
        console.error("❌ Staff auth initialization failed:", err);

        if (active && mountedRef.current) {
          setUserId(null);
          setNotifications([]);
          setLoading(false);
          setRefreshing(false);
          setError(err?.message ?? "Unable to determine the staff session.");
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
        return;
      }

      await loadNotifications(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;

    const setupRealtime = async () => {
      try {
        if (notificationChannelRef.current) {
          await supabase.removeChannel(notificationChannelRef.current);
          notificationChannelRef.current = null;
        }

        if (readChannelRef.current) {
          await supabase.removeChannel(readChannelRef.current);
          readChannelRef.current = null;
        }

        const notificationChannelName = `staff-notifications-${userId}-${instanceIdRef.current}`;

        const notificationChannel = supabase
          .channel(notificationChannelName)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
            },
            async (payload) => {
              if (!active || !mountedRef.current) {
                return;
              }

              const incoming = payload.new as StaffNotification;

              if (!isStaffNotificationType(incoming.type)) {
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

              const notification: StaffNotification = {
                ...incoming,
                read,
              };

              setNotifications((current) => {
                const exists = current.some(
                  (item) => item.id === notification.id,
                );

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
              if (!active || !mountedRef.current) {
                return;
              }

              const updated = payload.new as StaffNotification;

              if (!isStaffNotificationType(updated.type)) {
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

              const notification: StaffNotification = {
                ...updated,
                read,
              };

              setNotifications((current) => {
                const exists = current.some(
                  (item) => item.id === notification.id,
                );

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
              if (!active || !mountedRef.current) {
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
            if (active) {
              console.log("📡 Staff notification realtime:", status);
            }
          });

        notificationChannelRef.current = notificationChannel;

        const readChannelName = `staff-notification-reads-${userId}-${instanceIdRef.current}`;

        const readChannel = supabase
          .channel(readChannelName)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notification_reads",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              if (!active || !mountedRef.current) {
                return;
              }

              const inserted = payload.new as NotificationRead;

              if (!inserted.notification_id || inserted.user_id !== userId) {
                return;
              }

              setNotifications((current) =>
                current.map((notification) =>
                  notification.id === inserted.notification_id
                    ? {
                        ...notification,
                        read: true,
                      }
                    : notification,
                ),
              );
            },
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "notification_reads",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              if (!active || !mountedRef.current) {
                return;
              }

              const updated = payload.new as NotificationRead;

              if (!updated.notification_id || updated.user_id !== userId) {
                return;
              }

              setNotifications((current) =>
                current.map((notification) =>
                  notification.id === updated.notification_id
                    ? {
                        ...notification,
                        read: true,
                      }
                    : notification,
                ),
              );
            },
          )
          .on(
            "postgres_changes",
            {
              event: "DELETE",
              schema: "public",
              table: "notification_reads",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              if (!active || !mountedRef.current) {
                return;
              }

              const deleted = payload.old as Partial<NotificationRead>;

              if (!deleted.notification_id || deleted.user_id !== userId) {
                return;
              }

              setNotifications((current) =>
                current.map((notification) =>
                  notification.id === deleted.notification_id
                    ? {
                        ...notification,
                        read: false,
                      }
                    : notification,
                ),
              );
            },
          )
          .subscribe((status) => {
            if (active) {
              console.log("📡 Staff notification-read realtime:", status);
            }
          });

        readChannelRef.current = readChannel;
      } catch (err) {
        console.error("❌ Staff notification realtime setup failed:", err);
      }
    };

    setupRealtime();

    return () => {
      active = false;

      const notificationChannel = notificationChannelRef.current;

      const readChannel = readChannelRef.current;

      notificationChannelRef.current = null;
      readChannelRef.current = null;

      if (notificationChannel) {
        supabase.removeChannel(notificationChannel);
      }

      if (readChannel) {
        supabase.removeChannel(readChannel);
      }
    };
  }, [isStaffNotificationType, userId]);

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
              "❌ Mark global staff notification read failed:",
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

    const unreadNotifications = notifications.filter(
      (notification) => !notification.read,
    );

    const userSpecificIds = unreadNotifications
      .filter((notification) => notification.user_id === userId)
      .map((notification) => notification.id);

    const globalIds = unreadNotifications
      .filter((notification) => notification.user_id === null)
      .map((notification) => notification.id);

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      })),
    );

    try {
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
            "❌ Mark staff-specific notifications failed:",
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
            "❌ Mark global staff notifications failed:",
            insertError,
          );

          setNotifications(previous);

          return false;
        }
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
