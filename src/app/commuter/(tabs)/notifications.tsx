import { supabase } from "@/src/shared/config/supabase";
import { colors } from "@/src/shared/constants/theme";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Info,
  MessageCircle,
  Radio,
  RefreshCw,
  Send,
  Users,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import OceanBackground from "../../../src/shared/components/clay/OceanBackground";

type NotificationType =
  | "arrival"
  | "dispatch"
  | "occupancy"
  | "eta"
  | "status"
  | "queue"
  | "system"
  | "chat";

interface Notification {
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

const NOTIFICATION_SELECT = `
  id,
  user_id,
  title,
  message,
  type,
  read,
  data,
  created_at,
  updated_at
`;

export default function CommuterNotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(
    () =>
      notifications.reduce(
        (count, notification) => (notification.read ? count : count + 1),
        0,
      ),
    [notifications],
  );

  const getCurrentUserId = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Failed to get authenticated commuter:", authError);

      throw new Error(authError.message);
    }

    if (!user) {
      throw new Error("No authenticated commuter session.");
    }

    return user.id;
  }, []);

  const loadNotifications = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        setError(null);

        const userId = await getCurrentUserId();

        const { data, error: notificationError } = await supabase
          .from("notifications")
          .select(NOTIFICATION_SELECT)
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          });

        if (notificationError) {
          console.error("Failed to load notifications:", notificationError);

          throw new Error(notificationError.message);
        }

        setNotifications((data ?? []) as Notification[]);
      } catch (err: any) {
        console.error("Notification loading error:", err);

        setError(err?.message || "Unable to load notifications.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getCurrentUserId],
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribeToNotifications = async () => {
      try {
        const userId = await getCurrentUserId();

        channel = supabase
          .channel(`commuter-notifications-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              console.log("Notification realtime event:", payload.eventType);

              if (payload.eventType === "INSERT") {
                const newNotification = payload.new as Notification;

                setNotifications((current) => {
                  const alreadyExists = current.some(
                    (item) => item.id === newNotification.id,
                  );

                  if (alreadyExists) {
                    return current;
                  }

                  return [newNotification, ...current];
                });

                return;
              }

              if (payload.eventType === "UPDATE") {
                const updatedNotification = payload.new as Notification;

                setNotifications((current) =>
                  current.map((item) =>
                    item.id === updatedNotification.id
                      ? updatedNotification
                      : item,
                  ),
                );

                return;
              }

              if (payload.eventType === "DELETE") {
                const deletedNotification = payload.old as Notification;

                setNotifications((current) =>
                  current.filter((item) => item.id !== deletedNotification.id),
                );
              }
            },
          )
          .subscribe((status) => {
            console.log("Notification realtime status:", status);
          });
      } catch (err) {
        console.error("Notification realtime subscription error:", err);
      }
    };

    subscribeToNotifications();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [getCurrentUserId]);

  const markAsRead = async (notification: Notification) => {
    if (notification.read) {
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              read: true,
            }
          : item,
      ),
    );

    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        read: true,
      })
      .eq("id", notification.id);

    if (updateError) {
      console.error("Failed to mark notification as read:", updateError);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                read: false,
              }
            : item,
        ),
      );

      Alert.alert("Unable to update notification", updateError.message);
    }
  };

  const markAllAsRead = async () => {
    if (markingAll || unreadCount === 0) {
      return;
    }

    try {
      setMarkingAll(true);

      const userId = await getCurrentUserId();

      const { error: updateError } = await supabase
        .from("notifications")
        .update({
          read: true,
        })
        .eq("user_id", userId)
        .eq("read", false);

      if (updateError) {
        console.error("Failed to mark all notifications as read:", updateError);

        Alert.alert("Unable to update notifications", updateError.message);

        return;
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
        })),
      );
    } catch (err: any) {
      console.error("Mark all notifications error:", err);

      Alert.alert(
        "Unable to update notifications",
        err?.message || "Something went wrong.",
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications(false);
  };

  const getNotificationIcon = (type: NotificationType, read: boolean) => {
    const color = read ? colors.textMuted : colors.primaryDark;

    const size = 21;

    switch (type) {
      case "arrival":
        return <Radio size={size} color={color} strokeWidth={2.3} />;

      case "dispatch":
        return <Send size={size} color={color} strokeWidth={2.3} />;

      case "occupancy":
        return <Users size={size} color={color} strokeWidth={2.3} />;

      case "eta":
        return <Clock3 size={size} color={color} strokeWidth={2.3} />;

      case "status":
        return <Info size={size} color={color} strokeWidth={2.3} />;

      case "queue":
        return <Users size={size} color={color} strokeWidth={2.3} />;

      case "chat":
        return <MessageCircle size={size} color={color} strokeWidth={2.3} />;

      case "system":
      default:
        return <Bell size={size} color={color} strokeWidth={2.3} />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case "arrival":
        return "#DCFCE7";

      case "dispatch":
        return "#DBEAFE";

      case "occupancy":
        return "#FEF3C7";

      case "eta":
        return "#E0E7FF";

      case "status":
        return "#E0F2FE";

      case "queue":
        return "#E0F2FE";

      case "chat":
        return "#F3E8FF";

      case "system":
      default:
        return "#F1F5F9";
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case "arrival":
        return "Arrival";

      case "dispatch":
        return "Dispatch";

      case "occupancy":
        return "Occupancy";

      case "eta":
        return "ETA";

      case "status":
        return "Status";

      case "queue":
        return "Queue";

      case "chat":
        return "Chat";

      case "system":
      default:
        return "System";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();
    const difference = now.getTime() - date.getTime();

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (difference < minute) {
      return "Just now";
    }

    if (difference < hour) {
      const minutes = Math.floor(difference / minute);

      return `${minutes}m ago`;
    }

    if (difference < day) {
      const hours = Math.floor(difference / hour);

      return `${hours}h ago`;
    }

    if (difference < day * 7) {
      const days = Math.floor(difference / day);

      return `${days}d ago`;
    }

    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const renderNotification = (notification: Notification) => {
    const isUnread = !notification.read;

    return (
      <Pressable
        key={notification.id}
        onPress={() => markAsRead(notification)}
        className={`mb-3 rounded-[24px] border p-4 ${
          isUnread
            ? "border-ocean-200 bg-white"
            : "border-white/80 bg-clay-surface/80"
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowOpacity: isUnread ? 0.06 : 0.03,
          shadowRadius: 8,
          elevation: isUnread ? 2 : 1,
        }}
      >
        <View className="flex-row">
          <View
            className="h-[48px] w-[48px] items-center justify-center rounded-[16px]"
            style={{
              backgroundColor: getNotificationColor(notification.type),
            }}
          >
            {getNotificationIcon(notification.type, notification.read)}
          </View>

          <View className="ml-3 flex-1">
            <View className="flex-row items-start">
              <View className="flex-1 pr-2">
                <Text
                  numberOfLines={2}
                  className={`text-[14px] leading-[19px] ${
                    isUnread
                      ? "font-extrabold text-ink-dark"
                      : "font-bold text-ink-secondary"
                  }`}
                >
                  {notification.title}
                </Text>
              </View>

              {isUnread && (
                <View className="mt-1 h-[8px] w-[8px] rounded-full bg-ocean-500" />
              )}
            </View>

            <Text
              numberOfLines={3}
              className="mt-1.5 text-[12px] leading-[18px] text-ink-secondary"
            >
              {notification.message}
            </Text>

            <View className="mt-3 flex-row items-center">
              <Text className="text-[10px] font-semibold uppercase tracking-[0.7px] text-ocean-700">
                {getTypeLabel(notification.type)}
              </Text>

              <View className="mx-2 h-[3px] w-[3px] rounded-full bg-slate-300" />

              <Text className="text-[10px] font-medium text-ink-muted">
                {formatTime(notification.created_at)}
              </Text>

              {isUnread && (
                <>
                  <View className="flex-1" />

                  <Check
                    size={15}
                    color={colors.primaryDark}
                    strokeWidth={2.5}
                  />

                  <Text className="ml-1 text-[10px] font-bold text-ocean-700">
                    Mark read
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <OceanBackground>
        <SafeAreaView className="flex-1">
          <View className="flex-1 px-6">
            <Header
              unreadCount={0}
              onMarkAll={markAllAsRead}
              markingAll={false}
            />

            <View className="flex-1 items-center justify-center">
              <View className="h-[64px] w-[64px] items-center justify-center rounded-[22px] bg-white/90">
                <ActivityIndicator size="small" color={colors.primaryDark} />
              </View>

              <Text className="mt-4 text-[13px] font-semibold text-ink-secondary">
                Loading notifications...
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  return (
    <OceanBackground intensity={0.32}>
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-6">
          <Header
            unreadCount={unreadCount}
            onMarkAll={markAllAsRead}
            markingAll={markingAll}
          />

          {error ? (
            <View className="mt-8 rounded-[24px] border border-red-100 bg-white/90 p-5">
              <View className="h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-red-50">
                <X size={22} color="#DC2626" strokeWidth={2.4} />
              </View>

              <Text className="mt-4 text-[16px] font-extrabold text-ink-dark">
                Unable to load notifications
              </Text>

              <Text className="mt-2 text-[12px] leading-[18px] text-ink-secondary">
                {error}
              </Text>

              <Pressable
                onPress={() => loadNotifications()}
                className="mt-5 min-h-[48px] flex-row items-center justify-center rounded-full bg-ocean-400 px-5"
              >
                <RefreshCw size={17} color="#FFFFFF" strokeWidth={2.5} />

                <Text className="ml-2 text-[13px] font-extrabold text-white">
                  Try Again
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              className="mt-5 flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 110,
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.primaryDark}
                />
              }
            >
              {notifications.length === 0 ? (
                <EmptyNotifications />
              ) : (
                <>
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-[11px] font-bold uppercase tracking-[1px] text-ocean-700">
                      Recent activity
                    </Text>

                    <Text className="text-[10px] font-medium text-ink-muted">
                      {notifications.length}{" "}
                      {notifications.length === 1
                        ? "notification"
                        : "notifications"}
                    </Text>
                  </View>

                  {notifications.map(renderNotification)}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </OceanBackground>
  );
}

function Header({
  unreadCount,
  onMarkAll,
  markingAll,
}: {
  unreadCount: number;
  onMarkAll: () => void;
  markingAll: boolean;
}) {
  return (
    <View className="pt-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px] border border-white/90 bg-clay-surface shadow-clay-sm">
            <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-ocean-100">
              <Bell size={20} color={colors.primaryDark} strokeWidth={2.4} />
            </View>
          </View>

          <View className="ml-3">
            <Text className="text-[11px] font-bold uppercase tracking-[1.4px] text-ocean-700">
              Smart Queue
            </Text>

            <Text className="mt-0.5 text-[24px] font-extrabold text-ink-dark">
              Notifications
            </Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <View className="items-end">
            <View className="min-w-[32px] items-center rounded-full bg-ocean-400 px-2.5 py-1.5">
              <Text className="text-[11px] font-extrabold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>

            <Text className="mt-1 text-[9px] font-semibold text-ink-muted">
              unread
            </Text>
          </View>
        )}
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-[12px] text-ink-secondary">
          Stay updated with your commute.
        </Text>

        {unreadCount > 0 && (
          <Pressable
            disabled={markingAll}
            onPress={onMarkAll}
            className="flex-row items-center rounded-full bg-white/80 px-3 py-2"
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={colors.primaryDark} />
            ) : (
              <CheckCheck
                size={15}
                color={colors.primaryDark}
                strokeWidth={2.4}
              />
            )}

            <Text className="ml-1.5 text-[10px] font-extrabold text-ocean-700">
              Mark all read
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function EmptyNotifications() {
  return (
    <View className="mt-14 items-center px-6">
      <View className="h-[90px] w-[90px] items-center justify-center rounded-[30px] border border-white/90 bg-clay-surface shadow-clay">
        <View className="h-[62px] w-[62px] items-center justify-center rounded-full bg-ocean-100">
          <Bell size={29} color={colors.primaryDark} strokeWidth={2} />
        </View>
      </View>

      <Text className="mt-6 text-center text-[20px] font-extrabold text-ink-dark">
        You're all caught up
      </Text>

      <Text className="mt-2 max-w-[290px] text-center text-[12px] leading-[19px] text-ink-secondary">
        New jeepney arrivals, queue updates, dispatch information, and other
        Smart Queue alerts will appear here.
      </Text>

      <View className="mt-6 flex-row items-center rounded-full bg-white/70 px-4 py-2.5">
        <ChevronRight size={15} color={colors.primaryDark} strokeWidth={2.4} />

        <Text className="ml-1 text-[10px] font-bold text-ocean-700">
          Pull down to refresh
        </Text>
      </View>
    </View>
  );
}
