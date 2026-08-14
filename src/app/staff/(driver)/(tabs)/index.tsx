import { router } from "expo-router";
import {
  Bell,
  BusFront,
  ChevronRight,
  Clock3,
  MapPin,
  RefreshCw,
  Users,
} from "lucide-react-native";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "../../../../src/shared/components/clay/OceanBackground";
import { colors } from "../../../../src/shared/constants/theme";
import { useCommuterDashboard } from "../../../../src/shared/hooks/useCommuterDashboard";

function getStatusLabel(status: string) {
  switch (status?.toLowerCase()) {
    case "loading":
      return "Loading";

    case "waiting":
      return "Waiting";

    case "ready":
      return "Ready";

    case "arrived":
      return "Arrived";

    case "dispatched":
      return "Dispatched";

    case "departed":
      return "Departed";

    default:
      return status || "Unknown";
  }
}

function getStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case "loading":
      return {
        container: "bg-amber-100",
        text: "text-amber-700",
      };

    case "ready":
      return {
        container: "bg-green-100",
        text: "text-green-700",
      };

    case "arrived":
      return {
        container: "bg-sky-100",
        text: "text-sky-700",
      };

    case "dispatched":
      return {
        container: "bg-purple-100",
        text: "text-purple-700",
      };

    default:
      return {
        container: "bg-slate-100",
        text: "text-slate-600",
      };
  }
}

function getOccupancyPercentage(occupancy: number, capacity: number) {
  if (!capacity || capacity <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((occupancy / capacity) * 100));
}

function formatRelativeTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = Date.now();

  const difference = Math.max(0, now - date.getTime());

  const seconds = Math.floor(difference / 1000);

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

function formatTime(timestamp: string | null) {
  if (!timestamp) {
    return "Not available";
  }

  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Not available";
  }
}

function getActivityText(status: string, plateNumber: string) {
  switch (status?.toLowerCase()) {
    case "waiting":
      return `Jeepney ${plateNumber} is waiting`;

    case "loading":
      return `Jeepney ${plateNumber} is loading`;

    case "dispatched":
      return `Jeepney ${plateNumber} was dispatched`;

    case "arrived":
      return `Jeepney ${plateNumber} arrived`;

    case "ready":
      return `Jeepney ${plateNumber} is ready`;

    default:
      return `Jeepney ${plateNumber} was updated`;
  }
}

function NextJeepneyCard({
  jeepney,
}: {
  jeepney: ReturnType<typeof useCommuterDashboard>["nextJeepney"];
}) {
  if (!jeepney) {
    return (
      <View className="mt-5 rounded-[28px] border border-white/90 bg-clay-surface p-6 shadow-clay">
        <View className="items-center py-4">
          <View className="h-[58px] w-[58px] items-center justify-center rounded-[20px] bg-ocean-100">
            <BusFront size={28} color={colors.primaryDark} strokeWidth={2.1} />
          </View>

          <Text className="mt-4 text-[17px] font-extrabold text-ink-dark">
            No jeepneys in queue
          </Text>

          <Text className="mt-1 text-center text-[11px] leading-[17px] text-ink-secondary">
            There are currently no jeepneys waiting at the terminal.
          </Text>
        </View>
      </View>
    );
  }

  const occupancy = getOccupancyPercentage(
    jeepney.current_occupancy,
    jeepney.capacity,
  );

  const seatsLeft = Math.max(0, jeepney.capacity - jeepney.current_occupancy);

  const statusStyle = getStatusStyle(jeepney.status);

  return (
    <View className="mt-5 overflow-hidden rounded-[28px] border border-white/90 bg-clay-surface shadow-clay">
      <View className="bg-ocean-400 p-5">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-[10px] font-bold uppercase tracking-[1px] text-white/70">
              Next Jeepney
            </Text>

            <Text className="mt-1 text-[13px] font-semibold text-white/80">
              Queue position #{jeepney.queue_position}
            </Text>
          </View>

          <View className="h-[48px] w-[48px] items-center justify-center rounded-[17px] bg-white/20">
            <BusFront size={24} color="#FFFFFF" strokeWidth={2.1} />
          </View>
        </View>

        <Text className="mt-5 text-[28px] font-extrabold text-white">
          {jeepney.plate_number}
        </Text>

        <View className="mt-2 flex-row items-center">
          <MapPin size={13} color="#FFFFFF" strokeWidth={2.2} />

          <Text className="ml-1 text-[10px] font-semibold text-white/80">
            {jeepney.terminal_id === 1
              ? "Donsol Terminal"
              : jeepney.terminal_id === 2
                ? "Daraga Terminal"
                : "Terminal"}
          </Text>
        </View>
      </View>

      <View className="p-5">
        <View className="flex-row items-center justify-between">
          <View
            className={`flex-row items-center rounded-full px-3 py-2 ${statusStyle.container}`}
          >
            <View className="mr-2 h-[7px] w-[7px] rounded-full bg-current" />

            <Text className={`text-[10px] font-extrabold ${statusStyle.text}`}>
              {getStatusLabel(jeepney.status)}
            </Text>
          </View>

          <Text className="text-[11px] font-semibold text-ink-secondary">
            Bracket {jeepney.bracket}
          </Text>
        </View>

        <View className="mt-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Users size={15} color={colors.textSecondary} strokeWidth={2.2} />

              <Text className="ml-2 text-[11px] font-bold text-ink-secondary">
                Occupancy
              </Text>
            </View>

            <Text className="text-[12px] font-extrabold text-ink-dark">
              {jeepney.current_occupancy}/{jeepney.capacity}
            </Text>
          </View>

          <View className="mt-2 h-[9px] overflow-hidden rounded-full bg-ocean-100">
            <View
              className={
                occupancy >= 90
                  ? "h-full rounded-full bg-red-400"
                  : occupancy >= 70
                    ? "h-full rounded-full bg-amber-400"
                    : "h-full rounded-full bg-ocean-400"
              }
              style={{
                width: `${occupancy}%`,
              }}
            />
          </View>

          <View className="mt-2 flex-row justify-between">
            <Text className="text-[10px] text-ink-muted">
              {occupancy >= 100
                ? "Full"
                : occupancy >= 80
                  ? "Almost full"
                  : occupancy >= 50
                    ? "Moderate"
                    : "Seats available"}
            </Text>

            <Text className="text-[10px] font-semibold text-ink-secondary">
              {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} available
            </Text>
          </View>
        </View>

        {jeepney.loading_ends_at && (
          <View className="mt-5 flex-row items-center rounded-[18px] bg-ocean-50 px-4 py-3">
            <View className="h-[35px] w-[35px] items-center justify-center rounded-full bg-white">
              <Clock3 size={16} color={colors.primaryDark} strokeWidth={2.2} />
            </View>

            <View className="ml-3">
              <Text className="text-[9px] font-bold uppercase tracking-[0.6px] text-ink-muted">
                Loading ends
              </Text>

              <Text className="mt-0.5 text-[13px] font-extrabold text-ink-dark">
                {formatTime(jeepney.loading_ends_at)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

export default function CommuterDashboardScreen() {
  const {
    jeepneys,
    nextJeepney,
    queueCount,
    totalPassengers,
    availableSeats,
    activities,
    notifications,
    unreadNotificationCount,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
  } = useCommuterDashboard();

  /**
   * We intentionally only show a small activity preview.
   * The Queue screen contains the full queue.
   */
  const activityPreview = useMemo(() => {
    return activities.slice(0, 3);
  }, [activities]);

  const handleNotifications = () => {
    router.push("/commuter/(tabs)/notifications");
  };

  const handleQueue = () => {
    router.push("/commuter/(tabs)/queue");
  };

  if (loading && jeepneys.length === 0) {
    return (
      <OceanBackground intensity={0.3}>
        <SafeAreaView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primaryDark} />

          <Text className="mt-4 text-[13px] font-semibold text-ink-secondary">
            Loading your dashboard...
          </Text>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  return (
    <OceanBackground intensity={0.3}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 120,
          }}
        >
          {/* HEADER */}
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-[11px] font-bold uppercase tracking-[1.4px] text-ocean-700">
                SMART QUEUE
              </Text>

              <Text className="mt-1 text-[28px] font-extrabold text-ink-dark">
                Dashboard
              </Text>

              <View className="mt-2 flex-row items-center">
                <MapPin
                  size={14}
                  color={colors.primaryDark}
                  strokeWidth={2.2}
                />

                <Text className="ml-1 text-[11px] font-medium text-ink-secondary">
                  Donsol → Daraga
                </Text>
              </View>
            </View>

            {/* NOTIFICATION BELL */}
            <Pressable
              onPress={handleNotifications}
              className="relative h-[48px] w-[48px] items-center justify-center rounded-full border border-white/90 bg-clay-surface shadow-clay-sm"
            >
              <Bell size={21} color={colors.primaryDark} strokeWidth={2.2} />

              {unreadNotificationCount > 0 && (
                <View className="absolute right-[-1px] top-[-2px] min-h-[20px] min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1">
                  <Text className="text-[9px] font-extrabold text-white">
                    {unreadNotificationCount > 9
                      ? "9+"
                      : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* ERROR */}
          {error && (
            <View className="mt-5 rounded-[20px] border border-red-200 bg-red-50 p-4">
              <Text className="text-[12px] font-bold text-red-700">
                Unable to load some dashboard data
              </Text>

              <Text className="mt-1 text-[10px] leading-[15px] text-red-600">
                {error}
              </Text>

              <Pressable
                onPress={refresh}
                className="mt-3 self-start rounded-full bg-red-100 px-4 py-2"
              >
                <Text className="text-[10px] font-extrabold text-red-700">
                  Try Again
                </Text>
              </Pressable>
            </View>
          )}

          {/* LIVE TERMINAL */}
          <View className="mt-6 rounded-[28px] bg-ocean-400 p-5 shadow-clay-floating">
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-[1px] text-white/70">
                  Terminal Status
                </Text>

                <View className="mt-2 flex-row items-center">
                  <View className="mr-2 h-[9px] w-[9px] rounded-full bg-green-300" />

                  <Text className="text-[18px] font-extrabold text-white">
                    Live
                  </Text>
                </View>

                <Text className="mt-1 text-[11px] text-white/75">
                  Queue information updates automatically.
                </Text>
              </View>

              <View className="h-[50px] w-[50px] items-center justify-center rounded-[17px] bg-white/20">
                <RefreshCw size={22} color="#FFFFFF" strokeWidth={2} />
              </View>
            </View>

            <View className="mt-5 h-px bg-white/20" />

            <View className="mt-4 flex-row">
              <View className="flex-1">
                <Text className="text-[30px] font-extrabold text-white">
                  {queueCount}
                </Text>

                <Text className="text-[10px] font-medium text-white/70">
                  jeepneys waiting
                </Text>
              </View>

              <View className="flex-1 border-l border-white/20 pl-5">
                <Text className="text-[30px] font-extrabold text-white">
                  {availableSeats}
                </Text>

                <Text className="text-[10px] font-medium text-white/70">
                  seats available
                </Text>
              </View>
            </View>
          </View>

          {/* NEXT JEEPNEY */}
          <View className="mt-7 flex-row items-end justify-between">
            <View>
              <Text className="text-[19px] font-extrabold text-ink-dark">
                Next Jeepney
              </Text>

              <Text className="mt-1 text-[10px] text-ink-secondary">
                The next jeepney in the terminal queue
              </Text>
            </View>
          </View>

          <NextJeepneyCard jeepney={nextJeepney} />

          {/* VIEW QUEUE */}
          <Pressable
            onPress={handleQueue}
            className="mt-4 flex-row items-center justify-center rounded-full border border-ocean-200 bg-white px-5 py-4 shadow-clay-sm"
          >
            <Text className="text-[12px] font-extrabold text-ocean-700">
              View Full Queue
            </Text>

            <ChevronRight
              size={17}
              color={colors.primaryDark}
              strokeWidth={2.3}
            />
          </Pressable>

          {/* QUICK STATS */}
          <View className="mt-7">
            <Text className="mb-3 text-[11px] font-bold uppercase tracking-[1.1px] text-ocean-700">
              Terminal Overview
            </Text>

            <View className="flex-row gap-3">
              <View className="flex-1 rounded-[23px] border border-white/90 bg-clay-surface p-4 shadow-clay-sm">
                <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-ocean-100">
                  <BusFront
                    size={19}
                    color={colors.primaryDark}
                    strokeWidth={2.2}
                  />
                </View>

                <Text className="mt-4 text-[25px] font-extrabold text-ink-dark">
                  {queueCount}
                </Text>

                <Text className="mt-0.5 text-[10px] font-semibold text-ink-secondary">
                  In queue
                </Text>
              </View>

              <View className="flex-1 rounded-[23px] border border-white/90 bg-clay-surface p-4 shadow-clay-sm">
                <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-green-100">
                  <Users size={19} color="#16A34A" strokeWidth={2.2} />
                </View>

                <Text className="mt-4 text-[25px] font-extrabold text-ink-dark">
                  {totalPassengers}
                </Text>

                <Text className="mt-0.5 text-[10px] font-semibold text-ink-secondary">
                  Passengers aboard
                </Text>
              </View>
            </View>
          </View>

          {/* RECENT ACTIVITY */}
          <View className="mt-7">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[18px] font-extrabold text-ink-dark">
                  Recent Activity
                </Text>

                <Text className="mt-1 text-[10px] text-ink-secondary">
                  Latest terminal updates
                </Text>
              </View>

              <View className="rounded-full bg-ocean-100 px-3 py-1.5">
                <Text className="text-[9px] font-extrabold text-ocean-700">
                  LIVE
                </Text>
              </View>
            </View>

            <View className="mt-4 overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
              {activityPreview.length === 0 ? (
                <View className="items-center px-5 py-7">
                  <Text className="text-[12px] font-bold text-ink-dark">
                    No recent activity
                  </Text>

                  <Text className="mt-1 text-center text-[10px] text-ink-secondary">
                    Terminal activity will appear here.
                  </Text>
                </View>
              ) : (
                activityPreview.map((activity, index) => (
                  <View
                    key={activity.id}
                    className={`flex-row items-center px-5 py-4 ${
                      index < activityPreview.length - 1
                        ? "border-b border-ocean-100"
                        : ""
                    }`}
                  >
                    <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-ocean-100">
                      <BusFront
                        size={18}
                        color={colors.primaryDark}
                        strokeWidth={2.2}
                      />
                    </View>

                    <View className="ml-3 flex-1">
                      <Text className="text-[11px] font-extrabold text-ink-dark">
                        {getActivityText(activity.status, activity.plateNumber)}
                      </Text>

                      <Text className="mt-1 text-[9px] text-ink-secondary">
                        Queue position {activity.queuePosition ?? "—"}
                      </Text>
                    </View>

                    <Text className="text-[9px] font-semibold text-ink-muted">
                      {formatRelativeTime(activity.timestamp)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* NOTIFICATION PREVIEW */}
          <View className="mt-7">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[18px] font-extrabold text-ink-dark">
                  Notifications
                </Text>

                <Text className="mt-1 text-[10px] text-ink-secondary">
                  Important Smart Queue updates
                </Text>
              </View>

              <Pressable
                onPress={handleNotifications}
                className="flex-row items-center"
              >
                <Text className="text-[10px] font-extrabold text-ocean-700">
                  See all
                </Text>

                <ChevronRight size={15} color={colors.primaryDark} />
              </Pressable>
            </View>

            <View className="mt-4 overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
              {notifications.length === 0 ? (
                <View className="items-center px-5 py-7">
                  <Bell size={25} color={colors.textMuted} strokeWidth={2} />

                  <Text className="mt-3 text-[12px] font-bold text-ink-dark">
                    You're all caught up
                  </Text>

                  <Text className="mt-1 text-center text-[10px] text-ink-secondary">
                    No notifications right now.
                  </Text>
                </View>
              ) : (
                notifications.slice(0, 2).map((notification) => (
                  <Pressable
                    key={notification.id}
                    onPress={() => handleNotifications()}
                    className="flex-row items-center border-b border-ocean-100 px-5 py-4"
                  >
                    <View
                      className={`h-[9px] w-[9px] rounded-full ${
                        notification.read ? "bg-slate-300" : "bg-ocean-500"
                      }`}
                    />

                    <View className="ml-3 flex-1">
                      <Text className="text-[11px] font-extrabold text-ink-dark">
                        {notification.title}
                      </Text>

                      <Text
                        numberOfLines={1}
                        className="mt-1 text-[9px] text-ink-secondary"
                      >
                        {notification.message}
                      </Text>
                    </View>

                    <Text className="text-[9px] text-ink-muted">
                      {formatRelativeTime(notification.created_at)}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          </View>

          {/* LAST UPDATED */}
          <View className="mt-7 items-center">
            <Text className="text-[9px] text-ink-muted">
              {lastUpdated
                ? `Last updated ${lastUpdated.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}`
                : "Waiting for live data"}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </OceanBackground>
  );
}
