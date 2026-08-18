import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Info,
  Radio,
  RefreshCw,
  Send,
  Settings,
  Users,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
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

import OceanBackground from "@/src/shared/components/clay/OceanBackground";
import { colors } from "@/src/shared/constants/theme";
import {
  StaffNotification,
  StaffNotificationType,
  useStaffNotifications,
} from "@/src/shared/hooks/useStaffNotifications";

type Filter = "all" | "unread" | "queue" | "dispatch" | "system" | "critical";

const FILTERS: {
  key: Filter;
  label: string;
}[] = [
  {
    key: "all",
    label: "All",
  },
  {
    key: "unread",
    label: "Unread",
  },
  {
    key: "queue",
    label: "Queue",
  },
  {
    key: "dispatch",
    label: "Dispatch",
  },
  {
    key: "system",
    label: "System",
  },
  {
    key: "critical",
    label: "Critical",
  },
];

export default function AdminNotificationsScreen() {
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useStaffNotifications();

  const [filter, setFilter] = useState<Filter>("all");

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
    if (unreadCount === 0) {
      return;
    }

    const success = await markAllAsRead();

    if (!success) {
      Alert.alert(
        "Unable to update notifications",
        "The notifications could not be marked as read.",
      );
    }
  };

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case "unread":
        return notifications.filter((notification) => !notification.read);

      case "queue":
        return notifications.filter(
          (notification) => notification.type === "queue",
        );

      case "dispatch":
        return notifications.filter(
          (notification) => notification.type === "dispatch",
        );

      case "system":
        return notifications.filter(
          (notification) => notification.type === "system",
        );

      case "critical":
        return notifications.filter(
          (notification) =>
            notification.data?.priority === "critical" ||
            notification.data?.severity === "critical",
        );

      case "all":
      default:
        return notifications;
    }
  }, [filter, notifications]);

  const criticalCount = notifications.filter(
    (notification) =>
      !notification.read &&
      (notification.data?.priority === "critical" ||
        notification.data?.severity === "critical"),
  ).length;

  const todayCount = notifications.filter((notification) =>
    isToday(notification.created_at),
  ).length;

  if (loading) {
    return (
      <OceanBackground>
        <SafeAreaView className="flex-1">
          <View className="flex-1 px-6">
            <Header unreadCount={0} onMarkAll={handleMarkAllAsRead} />

            <View className="flex-1 items-center justify-center">
              <View
                className="h-[64px] w-[64px] items-center justify-center rounded-[22px]"
                style={clayStyle()}
              >
                <ActivityIndicator size="small" color={colors.primaryDark} />
              </View>

              <Text className="mt-4 text-[13px] font-semibold text-ink-secondary">
                Loading staff notifications...
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
          <Header unreadCount={unreadCount} onMarkAll={handleMarkAllAsRead} />

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
              <Stats
                unreadCount={unreadCount}
                criticalCount={criticalCount}
                todayCount={todayCount}
              />

              <FilterBar selected={filter} onChange={setFilter} />

              <View className="mb-3 mt-5 flex-row items-center justify-between">
                <View>
                  <Text className="text-[11px] font-bold uppercase tracking-[1px] text-ocean-700">
                    Recent activity
                  </Text>

                  <Text className="mt-1 text-[10px] font-medium text-ink-muted">
                    {filteredNotifications.length}{" "}
                    {filteredNotifications.length === 1
                      ? "notification"
                      : "notifications"}
                  </Text>
                </View>

                {filter !== "all" && (
                  <Pressable
                    onPress={() => setFilter("all")}
                    className="rounded-full px-3 py-1.5"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.78)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.95)",
                    }}
                  >
                    <Text className="text-[9px] font-bold text-ocean-700">
                      Clear filter
                    </Text>
                  </Pressable>
                )}
              </View>

              {filteredNotifications.length === 0 ? (
                <EmptyNotifications filter={filter} />
              ) : (
                filteredNotifications.map((notification) => (
                  <StaffNotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))
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
}: {
  unreadCount: number;
  onMarkAll: () => void;
}) {
  return (
    <View className="pt-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-[1px] text-ocean-700">
            SMART QUEUE
          </Text>

          <Text className="mt-1 text-[28px] font-extrabold text-ink-dark">
            Notifications
          </Text>

          <Text className="mt-2 text-[12px] font-medium text-ink-secondary">
            Staff activity and operational alerts.
          </Text>
        </View>

        <Pressable
          disabled={unreadCount === 0}
          onPress={onMarkAll}
          className="ml-3 h-[48px] w-[48px] items-center justify-center rounded-[17px] border border-white/90 bg-clay-surface shadow-clay-sm"
          style={{
            opacity: unreadCount === 0 ? 0.55 : 1,
          }}
        >
          <CheckCheck size={21} color={colors.primaryDark} strokeWidth={2.2} />

          {unreadCount > 0 && (
            <View className="absolute right-[-2px] top-[-2px] h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-500 px-1">
              <Text className="text-[8px] font-extrabold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Stats({
  unreadCount,
  criticalCount,
  todayCount,
}: {
  unreadCount: number;
  criticalCount: number;
  todayCount: number;
}) {
  return (
    <View className="flex-row gap-2">
      <StatCard
        label="Unread"
        value={unreadCount}
        subtitle="Needs attention"
        icon={<Bell size={19} color={colors.primaryDark} strokeWidth={2.3} />}
      />

      <StatCard
        label="Critical"
        value={criticalCount}
        subtitle="Priority alerts"
        icon={<AlertCircle size={19} color="#DC2626" strokeWidth={2.3} />}
      />

      <StatCard
        label="Today"
        value={todayCount}
        subtitle="All activity"
        icon={<Clock3 size={19} color="#0284C7" strokeWidth={2.3} />}
      />
    </View>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  icon,
}: {
  label: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <View
      className="flex-1 rounded-[22px] border border-white/90 bg-clay-surface p-3"
      style={clayStyle(2)}
    >
      <View className="h-[34px] w-[34px] items-center justify-center rounded-[12px] bg-ocean-100">
        {icon}
      </View>

      <Text className="mt-3 text-[9px] font-bold uppercase tracking-[0.7px] text-ink-muted">
        {label}
      </Text>

      <Text className="mt-0.5 text-[22px] font-extrabold text-ink-dark">
        {value}
      </Text>

      <Text className="mt-0.5 text-[8px] font-medium text-ink-secondary">
        {subtitle}
      </Text>
    </View>
  );
}

function FilterBar({
  selected,
  onChange,
}: {
  selected: Filter;
  onChange: (filter: Filter) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-4"
      contentContainerStyle={{
        paddingRight: 8,
      }}
    >
      {FILTERS.map((item) => {
        const active = selected === item.key;

        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            className="mr-2 rounded-full px-4 py-2.5"
            style={{
              backgroundColor: active ? "#E0F2FE" : "rgba(255,255,255,0.78)",
              borderWidth: 1,
              borderColor: active ? "#BAE6FD" : "rgba(255,255,255,0.95)",
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: active ? 2 : 1,
              },
              shadowOpacity: active ? 0.05 : 0.025,
              shadowRadius: 4,
              elevation: active ? 2 : 1,
            }}
          >
            <Text
              className="text-[10px] font-bold"
              style={{
                color: active ? "#0369A1" : "#64748B",
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function StaffNotificationCard({
  notification,
  onMarkAsRead,
}: {
  notification: StaffNotification;
  onMarkAsRead: (notificationId: string) => Promise<void>;
}) {
  const isUnread = !notification.read;
  const priority = getPriority(notification);

  return (
    <Pressable
      onPress={() => {
        if (isUnread) {
          onMarkAsRead(notification.id);
        }
      }}
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
                    backgroundColor:
                      priority === "critical"
                        ? "#DC2626"
                        : priority === "high"
                          ? "#EA580C"
                          : "#0EA5E9",
                    borderWidth: 1.5,
                    borderColor: "#FFFFFF",
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
              <View
                className="rounded-full px-2.5 py-1"
                style={{
                  backgroundColor: getNotificationColor(notification.type),
                }}
              >
                <Text
                  style={{
                    fontSize: 8,
                    fontWeight: "800",
                    letterSpacing: 0.7,
                    color: getNotificationTextColor(notification.type),
                  }}
                >
                  {getTypeLabel(notification.type)}
                </Text>
              </View>

              {priority !== "normal" && (
                <View
                  className="ml-2 rounded-full px-2.5 py-1"
                  style={{
                    backgroundColor:
                      priority === "critical" ? "#FEF2F2" : "#FFF7ED",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: "800",
                      letterSpacing: 0.5,
                      color: priority === "critical" ? "#DC2626" : "#C2410C",
                    }}
                  >
                    {priority.toUpperCase()}
                  </Text>
                </View>
              )}

              <View className="flex-1" />

              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: "#94A3B8",
                }}
              >
                {formatTime(notification.created_at)}
              </Text>
            </View>

            <View className="mt-3 flex-row items-center justify-end">
              {isUnread ? (
                <View
                  className="flex-row items-center rounded-full px-2.5 py-1.5"
                  style={{
                    backgroundColor: "#E0F2FE",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.95)",
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
              ) : (
                <View
                  className="flex-row items-center rounded-full px-2.5 py-1.5"
                  style={{
                    backgroundColor: "#F0F9FF",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.95)",
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
              )}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
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

function EmptyNotifications({ filter }: { filter: Filter }) {
  const message =
    filter === "unread"
      ? "There are no unread staff notifications."
      : filter === "critical"
        ? "There are no critical alerts right now."
        : "New queue, dispatch, vehicle, system, and staff alerts will appear here.";

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
        {filter === "unread" ? "You're all caught up" : "No notifications"}
      </Text>

      <Text className="mt-2 max-w-[290px] text-center text-[12px] leading-[19px] text-ink-secondary">
        {message}
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

function getNotificationIcon(type: StaffNotificationType) {
  const color = getNotificationIconColor(type);

  switch (type) {
    case "arrival":
      return <Radio size={21} color={color} strokeWidth={2.3} />;

    case "dispatch":
      return <Send size={21} color={color} strokeWidth={2.3} />;

    case "occupancy":
      return <Users size={21} color={color} strokeWidth={2.3} />;

    case "eta":
      return <Clock3 size={21} color={color} strokeWidth={2.3} />;

    case "status":
      return <Info size={21} color={color} strokeWidth={2.3} />;

    case "queue":
      return <Users size={21} color={color} strokeWidth={2.3} />;

    case "system":
      return <Settings size={21} color={color} strokeWidth={2.3} />;

    case "chat":
      return <Bell size={21} color={color} strokeWidth={2.3} />;

    default:
      return <Bell size={21} color={color} strokeWidth={2.3} />;
  }
}

function getNotificationColor(type: StaffNotificationType) {
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

    case "system":
      return "#F1F5F9";

    case "chat":
      return "#F3E8FF";

    default:
      return "#F1F5F9";
  }
}

function getNotificationIconColor(type: StaffNotificationType) {
  switch (type) {
    case "arrival":
      return "#16A34A";

    case "dispatch":
      return "#2563EB";

    case "occupancy":
      return "#D97706";

    case "eta":
      return "#4F46E5";

    case "status":
      return "#0284C7";

    case "queue":
      return "#0284C7";

    case "system":
      return "#64748B";

    case "chat":
      return "#9333EA";

    default:
      return "#64748B";
  }
}

function getNotificationTextColor(type: StaffNotificationType) {
  switch (type) {
    case "arrival":
      return "#15803D";

    case "dispatch":
      return "#1D4ED8";

    case "occupancy":
      return "#B45309";

    case "eta":
      return "#4338CA";

    case "status":
      return "#0369A1";

    case "queue":
      return "#0369A1";

    case "system":
      return "#475569";

    case "chat":
      return "#7E22CE";

    default:
      return "#475569";
  }
}

function getTypeLabel(type: StaffNotificationType) {
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

    case "system":
      return "System";

    case "chat":
      return "Chat";

    default:
      return "Notification";
  }
}

function getPriority(
  notification: StaffNotification,
): "low" | "normal" | "high" | "critical" {
  const priority = notification.data?.priority ?? notification.data?.severity;

  if (priority === "critical" || priority === "high" || priority === "low") {
    return priority;
  }

  return "normal";
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

function isToday(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
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
