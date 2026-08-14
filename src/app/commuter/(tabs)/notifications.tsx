import { colors } from "@/src/shared/constants/theme";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Info,
  Radio,
  RefreshCw,
  Send,
  Users,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
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
import { supabase } from "../../../src/shared/config/supabase";
import { useNotifications } from "../../../src/shared/hooks/useNotification";

type NotificationType =
  "arrival" | "dispatch" | "occupancy" | "eta" | "status" | "queue" | "system";

export default function CommuterNotificationsScreen() {
  const userId = useCurrentUserId();

  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications(userId);

  const handleMarkAsRead = async (notificationId: string) => {
    const success = await markAsRead(notificationId);

    if (!success) {
      Alert.alert(
        "Unable to update notification",
        "The notification could not be marked as read.",
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    const success = await markAllAsRead();

    if (!success) {
      Alert.alert(
        "Unable to update notifications",
        "The notifications could not be marked as read.",
      );
    }
  };

  if (loading) {
    return (
      <OceanBackground>
        <SafeAreaView className="flex-1">
          <View className="flex-1 px-6">
            <Header
              unreadCount={0}
              onMarkAll={handleMarkAllAsRead}
              markingAll={false}
            />

            <View className="flex-1 items-center justify-center">
              <View
                className="h-[64px] w-[64px] items-center justify-center rounded-[22px]"
                style={clayStyle()}
              >
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
            onMarkAll={handleMarkAllAsRead}
            markingAll={false}
          />

          {error ? (
            <ErrorState message={error} onRetry={refresh} />
          ) : (
            <ScrollView
              className="mt-5 flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 120,
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
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

                  {notifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onPress={() => handleMarkAsRead(notification.id)}
                    />
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </OceanBackground>
  );
}

function useCurrentUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("❌ Failed to get current user:", error);

          if (mounted) {
            setUserId(null);
          }

          return;
        }

        if (mounted) {
          setUserId(user?.id ?? null);
        }
      } catch (error) {
        console.error("❌ Current user error:", error);

        if (mounted) {
          setUserId(null);
        }
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUserId(session?.user?.id ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return userId;
}

function NotificationCard({
  notification,
  onPress,
}: {
  notification: {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    created_at: string;
  };
  onPress: () => void;
}) {
  const isUnread = !notification.read;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-[24px]"
      style={{
        backgroundColor: "#F8FCFF",
        borderWidth: 1,
        borderColor: isUnread
          ? "rgba(186,230,253,0.95)"
          : "rgba(255,255,255,0.95)",
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: isUnread ? 4 : 3,
        },
        shadowOpacity: isUnread ? 0.08 : 0.055,
        shadowRadius: isUnread ? 10 : 9,
        elevation: isUnread ? 3 : 2,
        overflow: "visible",
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 1,
          left: 18,
          right: 18,
          height: 2,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.95)",
        }}
      />

      <View className="p-4">
        <View className="flex-row">
          <View
            className="h-[48px] w-[48px] items-center justify-center rounded-[16px]"
            style={{
              backgroundColor: getNotificationColor(notification.type),
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.9)",
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.055,
              shadowRadius: 5,
              elevation: 2,
            }}
          >
            {getNotificationIcon(notification.type)}
          </View>

          <View className="ml-3 flex-1">
            <View className="flex-row items-start">
              <View className="flex-1 pr-2">
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 14,
                    lineHeight: 19,
                    fontWeight: isUnread ? "800" : "700",
                    color: "#0F172A",
                  }}
                >
                  {notification.title}
                </Text>
              </View>

              {isUnread && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    marginTop: 4,
                    borderRadius: 999,
                    backgroundColor: "#0EA5E9",
                    borderWidth: 1.5,
                    borderColor: "#FFFFFF",
                    shadowColor: "#0EA5E9",
                    shadowOffset: {
                      width: 0,
                      height: 1,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                />
              )}
            </View>

            <Text
              numberOfLines={3}
              style={{
                marginTop: 6,
                fontSize: 12,
                lineHeight: 18,
                color: "#475569",
                fontWeight: "500",
              }}
            >
              {notification.message}
            </Text>

            <View className="mt-3 flex-row items-center">
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 0.7,
                  textTransform: "uppercase",
                  color: "#0369A1",
                }}
              >
                {getTypeLabel(notification.type)}
              </Text>

              <View
                className="mx-2 h-[3px] w-[3px] rounded-full"
                style={{
                  backgroundColor: "#CBD5E1",
                }}
              />

              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: "#94A3B8",
                }}
              >
                {formatTime(notification.created_at)}
              </Text>

              {isUnread ? (
                <>
                  <View className="flex-1" />

                  <View
                    className="flex-row items-center rounded-full px-2.5 py-1.5"
                    style={{
                      backgroundColor: "#E0F2FE",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.95)",
                      shadowColor: "#000",
                      shadowOffset: {
                        width: 0,
                        height: 1,
                      },
                      shadowOpacity: 0.04,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <Check
                      size={14}
                      color={colors.primaryDark}
                      strokeWidth={2.6}
                    />

                    <Text
                      className="ml-1"
                      style={{
                        fontSize: 10,
                        fontWeight: "800",
                        color: "#0369A1",
                      }}
                    >
                      Mark read
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-1" />

                  <View
                    className="flex-row items-center rounded-full px-2.5 py-1.5"
                    style={{
                      backgroundColor: "#F0F9FF",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.95)",
                      shadowColor: "#000",
                      shadowOffset: {
                        width: 0,
                        height: 1,
                      },
                      shadowOpacity: 0.035,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <CheckCheck size={14} color="#38A3D1" strokeWidth={2.4} />

                    <Text
                      className="ml-1"
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: "#3B82A8",
                      }}
                    >
                      Read
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
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
          <View
            className="h-[52px] w-[52px] items-center justify-center rounded-[18px]"
            style={clayStyle()}
          >
            <View
              className="h-[38px] w-[38px] items-center justify-center rounded-full"
              style={{
                backgroundColor: "#E0F2FE",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.9)",
              }}
            >
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
            <View
              className="min-w-[32px] items-center rounded-full px-2.5 py-1.5"
              style={{
                backgroundColor: "#38BDF8",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.9)",
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
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
            className="flex-row items-center rounded-full px-3 py-2"
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.95)",
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.045,
              shadowRadius: 4,
              elevation: 1,
            }}
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

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void>;
}) {
  return (
    <View
      className="mt-8 rounded-[24px] p-5"
      style={{
        backgroundColor: "#FFF8F8",
        borderWidth: 1,
        borderColor: "#FECACA",
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View
        className="h-[48px] w-[48px] items-center justify-center rounded-[16px]"
        style={{
          backgroundColor: "#FEF2F2",
          borderWidth: 1,
          borderColor: "#FFFFFF",
        }}
      >
        <X size={22} color="#DC2626" strokeWidth={2.4} />
      </View>

      <Text className="mt-4 text-[16px] font-extrabold text-ink-dark">
        Unable to load notifications
      </Text>

      <Text className="mt-2 text-[12px] leading-[18px] text-ink-secondary">
        {message}
      </Text>

      <Pressable
        onPress={onRetry}
        className="mt-5 min-h-[48px] flex-row items-center justify-center rounded-full"
        style={{
          backgroundColor: "#38BDF8",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.95)",
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <RefreshCw size={17} color="#FFFFFF" strokeWidth={2.5} />

        <Text className="ml-2 text-[13px] font-extrabold text-white">
          Try Again
        </Text>
      </Pressable>
    </View>
  );
}

function EmptyNotifications() {
  return (
    <View className="mt-14 items-center px-6">
      <View
        className="h-[90px] w-[90px] items-center justify-center rounded-[30px]"
        style={clayStyle(3)}
      >
        <View
          className="h-[62px] w-[62px] items-center justify-center rounded-full"
          style={{
            backgroundColor: "#E0F2FE",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.9)",
          }}
        >
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

      <View
        className="mt-6 flex-row items-center rounded-full px-4 py-2.5"
        style={{
          backgroundColor: "rgba(255,255,255,0.78)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.95)",
        }}
      >
        <ChevronRight size={15} color={colors.primaryDark} strokeWidth={2.4} />

        <Text className="ml-1 text-[10px] font-bold text-ocean-700">
          Pull down to refresh
        </Text>
      </View>
    </View>
  );
}

function getNotificationIcon(type: NotificationType) {
  const colorsByType: Record<NotificationType, string> = {
    arrival: "#16A34A",
    dispatch: "#2563EB",
    occupancy: "#D97706",
    eta: "#4F46E5",
    status: "#0284C7",
    queue: "#0284C7",
    system: "#64748B",
  };

  const color = colorsByType[type];
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

    default:
      return <Bell size={size} color={color} strokeWidth={2.3} />;
  }
}

function getNotificationColor(type: NotificationType) {
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

    default:
      return "#F1F5F9";
  }
}

function getTypeLabel(type: NotificationType) {
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

    default:
      return "System";
  }
}

function formatTime(dateString: string) {
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
    return `${Math.floor(difference / minute)}m ago`;
  }

  if (difference < day) {
    return `${Math.floor(difference / hour)}h ago`;
  }

  if (difference < day * 7) {
    return `${Math.floor(difference / day)}d ago`;
  }

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function clayStyle(elevation = 2) {
  return {
    backgroundColor: "#F8FCFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: elevation,
    },
    shadowOpacity: 0.06,
    shadowRadius: elevation === 3 ? 10 : 7,
    elevation,
  };
}
