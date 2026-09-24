import { router } from "expo-router";
import {
  Bell,
  BusFront,
  ChevronRight,
  Clock3,
  MapPin,
  Users,
} from "lucide-react-native";
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
import {
  DriverJeepney,
  useDriverDashboard,
} from "../../../../src/shared/hooks/driver/useDriverDashboard";

function getStatusLabel(status: string) {
  switch (status?.toLowerCase()) {
    case "waiting":
      return "Waiting";
    case "loading":
      return "Loading";
    case "en_route":
      return "En Route";
    case "arrived":
      return "Arrived";
    case "dispatched":
      return "Dispatched";
    case "inactive":
      return "Inactive";
    default:
      return status || "Unknown";
  }
}

function getOccupancyPercentage(occupancy: number, capacity: number) {
  if (!capacity || capacity <= 0) return 0;
  return Math.min(100, Math.round((occupancy / capacity) * 100));
}

function formatTime(timestamp: string | null) {
  if (!timestamp) return "Not available";
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Not available";
  }
}

function MyJeepneyCard({
  jeepney,
  aheadOfMe,
  isNextInLine,
  isLoadingNow,
}: {
  jeepney: DriverJeepney | null;
  aheadOfMe: number;
  isNextInLine: boolean;
  isLoadingNow: boolean;
}) {
  if (!jeepney) {
    return (
      <View className="mt-5 rounded-[28px] border border-white/90 bg-clay-surface p-6 shadow-clay">
        <View className="items-center py-4">
          <View className="h-[58px] w-[58px] items-center justify-center rounded-[20px] bg-ocean-100">
            <BusFront size={28} color={colors.primaryDark} strokeWidth={2.1} />
          </View>

          <Text className="mt-4 text-[17px] font-extrabold text-ink-dark">
            You're not in the queue
          </Text>

          <Text className="mt-1 text-center text-[11px] leading-[17px] text-ink-secondary">
            Enter the terminal geofence to join the queue automatically.
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
  const highlighted = isNextInLine || isLoadingNow;

  return (
    <View
      className={`mt-5 overflow-hidden rounded-[28px] shadow-clay-floating ${
        highlighted ? "border-2 border-amber-300" : "border border-white/90"
      }`}
    >
      {highlighted && (
        <View className="bg-amber-400 px-5 py-2.5">
          <Text className="text-center text-[11px] font-extrabold uppercase tracking-[1px] text-amber-950">
            {isLoadingNow ? "You're loading now" : "You're next — get ready"}
          </Text>
        </View>
      )}

      <View className="bg-ocean-400 p-5">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-[10px] font-bold uppercase tracking-[1px] text-white/70">
              Your Jeepney
            </Text>

            <Text className="mt-1 text-[13px] font-semibold text-white/80">
              {jeepney.jeep_name || jeepney.plate_number}
            </Text>
          </View>

          <View className="h-[48px] w-[48px] items-center justify-center rounded-[17px] bg-white/20">
            <BusFront size={24} color="#FFFFFF" strokeWidth={2.1} />
          </View>
        </View>

        <View className="mt-5 flex-row items-end">
          <Text className="text-[52px] font-extrabold leading-[52px] text-white">
            {jeepney.queue_position ?? "#"}
          </Text>
          <Text className="mb-1.5 ml-2 text-[13px] font-semibold text-white/75">
            queue position
          </Text>
        </View>

        <Text className="mt-1 text-[11px] font-semibold text-white/75">
          {jeepney.queue_position
            ? aheadOfMe === 0
              ? "You're at the front of the line"
              : `${aheadOfMe} ${aheadOfMe === 1 ? "jeepney" : "jeepneys"} ahead of you`
            : "Not currently queued"}
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

      <View className="bg-clay-surface p-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center rounded-full bg-ocean-100 px-3 py-2">
            <View className="mr-2 h-[7px] w-[7px] rounded-full bg-ocean-600" />
            <Text className="text-[10px] font-extrabold text-ocean-700">
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
              style={{ width: `${occupancy}%` }}
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
              {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left
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

export default function DriverDashboardScreen() {
  const {
    myJeepney,
    queueJeepneys,
    totalInQueue,
    aheadOfMe,
    isNextInLine,
    isLoadingNow,
    notifications,
    unreadNotificationCount,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
  } = useDriverDashboard();

  const handleNotifications = () => {
    router.push("/staff/(driver)/notifications");
  };

  const handleQueue = () => {
    router.push("/staff/(driver)/(tabs)/queue");
  };

  if (loading && !myJeepney) {
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
                My Dashboard
              </Text>
              {myJeepney?.plate_number && (
                <Text className="mt-2 text-[11px] font-medium text-ink-secondary">
                  {myJeepney.plate_number}
                  {myJeepney.driver_name ? ` · ${myJeepney.driver_name}` : ""}
                </Text>
              )}
            </View>

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
                Unable to load your dashboard
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

          {/* MY JEEPNEY — the highlighted, driver-specific card */}
          <MyJeepneyCard
            jeepney={myJeepney}
            aheadOfMe={aheadOfMe}
            isNextInLine={isNextInLine}
            isLoadingNow={isLoadingNow}
          />

          {/* VIEW QUEUE */}
          <Pressable
            onPress={handleQueue}
            className="mt-4 flex-row items-center justify-center rounded-full border border-ocean-200 bg-white px-5 py-4 shadow-clay-sm"
          >
            <Text className="text-[12px] font-extrabold text-ocean-700">
              View Full Terminal Queue
            </Text>
            <ChevronRight
              size={17}
              color={colors.primaryDark}
              strokeWidth={2.3}
            />
          </Pressable>

          {/* TERMINAL SNAPSHOT */}
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
                  {totalInQueue}
                </Text>
                <Text className="mt-0.5 text-[10px] font-semibold text-ink-secondary">
                  Jeepneys in queue
                </Text>
              </View>

              <View className="flex-1 rounded-[23px] border border-white/90 bg-clay-surface p-4 shadow-clay-sm">
                <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-amber-100">
                  <Users size={19} color="#B45309" strokeWidth={2.2} />
                </View>
                <Text className="mt-4 text-[25px] font-extrabold text-ink-dark">
                  {aheadOfMe}
                </Text>
                <Text className="mt-0.5 text-[10px] font-semibold text-ink-secondary">
                  Ahead of you
                </Text>
              </View>
            </View>
          </View>

          {/* QUEUE LIST WITH "YOU" HIGHLIGHTED */}
          <View className="mt-7">
            <Text className="mb-3 text-[18px] font-extrabold text-ink-dark">
              Queue Order
            </Text>

            <View className="overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
              {queueJeepneys.length === 0 ? (
                <View className="items-center px-5 py-7">
                  <Text className="text-[12px] font-bold text-ink-dark">
                    Queue is empty
                  </Text>
                </View>
              ) : (
                queueJeepneys.map((jeep, index) => {
                  const isMe = jeep.id === myJeepney?.id;
                  return (
                    <View
                      key={jeep.id}
                      className={`flex-row items-center px-5 py-4 ${
                        index < queueJeepneys.length - 1
                          ? "border-b border-ocean-100"
                          : ""
                      } ${isMe ? "bg-amber-50" : ""}`}
                    >
                      <View
                        className={`h-[32px] w-[32px] items-center justify-center rounded-full ${
                          isMe ? "bg-amber-400" : "bg-ocean-100"
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-extrabold ${
                            isMe ? "text-amber-950" : "text-ocean-700"
                          }`}
                        >
                          {jeep.queue_position ?? "—"}
                        </Text>
                      </View>

                      <View className="ml-3 flex-1">
                        <Text className="text-[11px] font-extrabold text-ink-dark">
                          {jeep.plate_number} {isMe ? "(You)" : ""}
                        </Text>
                        <Text className="mt-0.5 text-[9px] text-ink-secondary">
                          {getStatusLabel(jeep.status)}
                        </Text>
                      </View>

                      <Text className="text-[9px] font-semibold text-ink-muted">
                        {jeep.current_occupancy}/{jeep.capacity}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* NOTIFICATION PREVIEW */}
          <View className="mt-7">
            <View className="flex-row items-center justify-between">
              <Text className="text-[18px] font-extrabold text-ink-dark">
                Notifications
              </Text>
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
                </View>
              ) : (
                notifications.slice(0, 2).map((notification) => (
                  <Pressable
                    key={notification.id}
                    onPress={handleNotifications}
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
                  </Pressable>
                ))
              )}
            </View>
          </View>

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
