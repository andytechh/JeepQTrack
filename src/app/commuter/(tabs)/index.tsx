import { useRouter } from "expo-router";
import {
  ArrowRight,
  Bell,
  BusFront,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
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

import OceanBackground from "../../../src/shared/components/clay/OceanBackground";
import { colors } from "../../../src/shared/constants/theme";
import { useCommuterDashboard } from "../../../src/shared/hooks/useCommuterDashboard";
import { useCurrentUserId } from "../../../src/shared/hooks/useCurrentUserId";
import { useNotifications } from "../../../src/shared/hooks/useNotification";

/* ============================================================
   HELPERS
============================================================ */

function getTerminalName(
  terminalId: number | null,
  terminalNames: Record<number, string>,
) {
  if (!terminalId) return "Terminal";

  return terminalNames[terminalId] ?? `Terminal ${terminalId}`;
}

function getOccupancyPercentage(occupancy: number, capacity: number): number {
  if (!capacity || capacity <= 0) return 0;

  return Math.min(100, Math.round((occupancy / capacity) * 100));
}

function getOccupancyLabel(occupancy: number, capacity: number): string {
  const percentage = getOccupancyPercentage(occupancy, capacity);

  if (percentage >= 100) return "Full";
  if (percentage >= 80) return "Almost full";
  if (percentage >= 50) return "Moderate";

  return "Seats available";
}

function getActivityText(status: string) {
  const normalized = status?.toLowerCase();

  switch (normalized) {
    case "waiting":
      return "joined the queue";

    case "dispatched":
      return "was dispatched";

    case "loading":
      return "is loading";

    case "arrived":
      return "arrived at the terminal";

    default:
      return "queue status updated";
  }
}

function formatActivityTime(timestamp: string) {
  try {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* ============================================================
   NEXT JEEPNEY CARD
============================================================ */

function NextJeepneyCard({
  jeepney,
  terminalName,
}: {
  jeepney: any;
  terminalName: string;
}) {
  const occupancy = getOccupancyPercentage(
    jeepney.current_occupancy,
    jeepney.capacity,
  );

  const isLoading = jeepney.status?.toLowerCase() === "loading";

  const isDispatched = jeepney.status?.toLowerCase() === "dispatched";

  return (
    <View className="mt-4 overflow-hidden rounded-[28px] border border-white/90 bg-clay-surface p-5 shadow-clay-floating">
      {/* TOP */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-[10px] font-extrabold uppercase tracking-[1px] text-ink-muted">
            Next Jeepney
          </Text>

          <Text className="mt-2 text-[27px] font-extrabold text-ink-dark">
            {jeepney.plate_number}
          </Text>

          <View className="mt-2 flex-row items-center">
            <MapPin size={13} color={colors.primaryDark} strokeWidth={2.3} />

            <Text className="ml-1.5 text-[11px] font-semibold text-ink-secondary">
              {terminalName}
            </Text>
          </View>
        </View>

        <View className="h-[50px] w-[50px] items-center justify-center rounded-[17px] bg-ocean-100">
          <BusFront size={24} color={colors.primaryDark} strokeWidth={2.2} />
        </View>
      </View>

      {/* QUEUE POSITION */}
      <View className="mt-5 flex-row items-center rounded-[18px] bg-ocean-50 px-4 py-3">
        <View className="h-[35px] w-[35px] items-center justify-center rounded-full bg-white">
          <Text className="text-[13px] font-extrabold text-ocean-700">#</Text>
        </View>

        <View className="ml-3">
          <Text className="text-[9px] font-bold uppercase tracking-[0.7px] text-ink-muted">
            Queue position
          </Text>

          <Text className="mt-0.5 text-[15px] font-extrabold text-ink-dark">
            #{jeepney.queue_position ?? "—"}
          </Text>
        </View>
      </View>

      {/* OCCUPANCY */}
      <View className="mt-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Users size={15} color={colors.textSecondary} strokeWidth={2.2} />

            <Text className="ml-2 text-[11px] font-bold text-ink-secondary">
              Occupancy
            </Text>
          </View>

          <Text className="text-[11px] font-extrabold text-ink-dark">
            {jeepney.current_occupancy ?? 0}/{jeepney.capacity ?? 0}
          </Text>
        </View>

        <View className="mt-2 h-[9px] overflow-hidden rounded-full bg-ocean-100">
          <View
            className={`h-full rounded-full ${
              occupancy >= 90
                ? "bg-red-400"
                : occupancy >= 70
                  ? "bg-amber-400"
                  : "bg-ocean-400"
            }`}
            style={{
              width: `${occupancy}%`,
            }}
          />
        </View>

        <View className="mt-2 flex-row justify-between">
          <Text className="text-[10px] text-ink-muted">
            {getOccupancyLabel(
              jeepney.current_occupancy ?? 0,
              jeepney.capacity ?? 0,
            )}
          </Text>

          <Text className="text-[10px] font-semibold text-ink-secondary">
            {occupancy}%
          </Text>
        </View>
      </View>

      {/* STATUS */}
      <View className="mt-5 flex-row items-center">
        <View
          className={`h-[40px] w-[40px] items-center justify-center rounded-[14px] ${
            isLoading
              ? "bg-amber-100"
              : isDispatched
                ? "bg-green-100"
                : "bg-sky-100"
          }`}
        >
          {isLoading ? (
            <Clock3 size={18} color="#D97706" strokeWidth={2.3} />
          ) : isDispatched ? (
            <CheckCircle2 size={18} color="#16A34A" strokeWidth={2.3} />
          ) : (
            <BusFront size={18} color={colors.primaryDark} strokeWidth={2.3} />
          )}
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-[9px] font-bold uppercase tracking-[0.6px] text-ink-muted">
            Current status
          </Text>

          <Text className="mt-0.5 text-[14px] font-extrabold capitalize text-ink-dark">
            {jeepney.status ?? "Waiting"}
          </Text>
        </View>
      </View>

      {/* DRIVER */}
      {jeepney.driver_name ? (
        <View className="mt-4 border-t border-slate-200/70 pt-4">
          <Text className="text-[9px] font-bold uppercase tracking-[0.6px] text-ink-muted">
            Driver
          </Text>

          <Text className="mt-1 text-[11px] font-semibold text-ink-secondary">
            {jeepney.driver_name}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* ============================================================
   QUEUE SUMMARY
============================================================ */

function QueueSummaryCard({
  queueCount,
  terminalOneCount,
  terminalTwoCount,
}: {
  queueCount: number;
  terminalOneCount: number;
  terminalTwoCount: number;
}) {
  return (
    <View className="mt-6 overflow-hidden rounded-[28px] border border-white/90 bg-ocean-400 p-5 shadow-clay-floating">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-[10px] font-extrabold uppercase tracking-[1px] text-white/70">
            Live Terminal
          </Text>

          <Text className="mt-2 text-[40px] font-extrabold leading-[44px] text-white">
            {queueCount}
          </Text>

          <Text className="text-[12px] font-semibold text-white/80">
            jeepneys in queue
          </Text>
        </View>

        <View className="h-[54px] w-[54px] items-center justify-center rounded-[18px] bg-white/20">
          <BusFront size={26} color="#FFFFFF" strokeWidth={2.1} />
        </View>
      </View>

      <View className="mt-5 h-[1px] bg-white/20" />

      <View className="mt-4 flex-row">
        <View className="flex-1">
          <Text className="text-[9px] font-bold uppercase tracking-[0.6px] text-white/60">
            Donsol
          </Text>

          <Text className="mt-1 text-[18px] font-extrabold text-white">
            {terminalOneCount}
          </Text>

          <Text className="text-[9px] font-medium text-white/70">in queue</Text>
        </View>

        <View className="w-[1px] bg-white/20" />

        <View className="ml-5 flex-1">
          <Text className="text-[9px] font-bold uppercase tracking-[0.6px] text-white/60">
            Daraga
          </Text>

          <Text className="mt-1 text-[18px] font-extrabold text-white">
            {terminalTwoCount}
          </Text>

          <Text className="text-[9px] font-medium text-white/70">in queue</Text>
        </View>
      </View>
    </View>
  );
}

/* ============================================================
   ACTIVITY CARD
============================================================ */

function ActivityCard({
  activities,
  terminalNames,
}: {
  activities: any[];
  terminalNames: Record<number, string>;
}) {
  return (
    <View className="mt-4 overflow-hidden rounded-[26px] border border-white/90 bg-clay-surface shadow-clay-sm">
      {activities.length === 0 ? (
        <View className="items-center px-5 py-8">
          <RefreshCw size={23} color={colors.textMuted} />

          <Text className="mt-3 text-[12px] font-semibold text-ink-secondary">
            No recent queue activity
          </Text>
        </View>
      ) : (
        activities.slice(0, 5).map((activity, index) => {
          const terminalName = getTerminalName(
            activity.terminalId,
            terminalNames,
          );

          const isLast = index === Math.min(activities.length, 5) - 1;

          return (
            <View
              key={activity.id}
              className={`flex-row items-center px-5 py-4 ${
                !isLast ? "border-b border-slate-200/70" : ""
              }`}
            >
              <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-ocean-100">
                <BusFront
                  size={17}
                  color={colors.primaryDark}
                  strokeWidth={2.2}
                />
              </View>

              <View className="ml-3 flex-1">
                <Text
                  numberOfLines={2}
                  className="text-[11px] font-bold leading-[16px] text-ink-dark"
                >
                  <Text className="font-extrabold">{activity.plateNumber}</Text>{" "}
                  {getActivityText(activity.status)}
                </Text>

                <Text className="mt-1 text-[9px] font-medium text-ink-muted">
                  {terminalName}
                  {activity.queuePosition
                    ? ` • Queue #${activity.queuePosition}`
                    : ""}
                </Text>
              </View>

              <Text className="ml-2 text-[9px] font-semibold text-ink-muted">
                {formatActivityTime(activity.timestamp)}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

/* ============================================================
   NOTIFICATION PREVIEW
============================================================ */

function NotificationPreview({
  notifications,
  unreadCount,
  onPress,
}: {
  notifications: any[];
  unreadCount: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mt-4 overflow-hidden rounded-[26px] border border-white/90 bg-clay-surface shadow-clay-sm"
    >
      <View className="flex-row items-center px-5 py-4">
        <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
          <Bell size={19} color={colors.primaryDark} strokeWidth={2.2} />

          {unreadCount > 0 ? (
            <View className="absolute right-[-2px] top-[-2px] h-[13px] min-w-[13px] items-center justify-center rounded-full bg-red-500 px-[3px]">
              <Text className="text-[7px] font-extrabold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="text-[13px] font-extrabold text-ink-dark">
              Notifications
            </Text>

            {unreadCount > 0 ? (
              <View className="ml-2 rounded-full bg-red-100 px-2 py-1">
                <Text className="text-[8px] font-extrabold text-red-600">
                  {unreadCount} unread
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="mt-1 text-[10px] text-ink-secondary">
            {notifications.length > 0
              ? notifications[0].title
              : "No new notifications"}
          </Text>
        </View>

        <ChevronRight size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

/* ============================================================
   MAIN DASHBOARD
============================================================ */

export default function CommuterDashboardScreen() {
  const router = useRouter();

  const {
    profile,
    jeepneys,
    nextJeepney,
    queueCount,
    activities,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
    terminalNames,
  } = useCommuterDashboard();

  /* ==========================================================
     NOTIFICATIONS

     Called directly here — same hook, same pattern as
     CommuterNotificationsScreen — instead of going through
     useCommuterDashboard's own (broken) notification wiring.
     This guarantees the bell badge and the notifications
     screen always agree, since they're now reading from the
     exact same code path.
  ========================================================== */

  const notificationsUserId = useCurrentUserId();

  const { notifications, unreadCount: unreadNotificationCount } =
    useNotifications(notificationsUserId);

  /* ==========================================================
     TERMINAL COUNTS
  ========================================================== */

  const terminalCounts = useMemo(() => {
    return {
      donsol: jeepneys.filter((jeepney) => jeepney.terminal_id === 1).length,

      daraga: jeepneys.filter((jeepney) => jeepney.terminal_id === 2).length,
    };
  }, [jeepneys]);

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh = async () => {
    await refresh();
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading && jeepneys.length === 0) {
    return (
      <OceanBackground intensity={0.2}>
        <SafeAreaView className="flex-1 items-center justify-center">
          <View className="items-center">
            <View className="h-[64px] w-[64px] items-center justify-center rounded-[21px] bg-clay-surface shadow-clay-sm">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>

            <Text className="mt-4 text-[13px] font-bold text-ink-secondary">
              Loading Smart Queue...
            </Text>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (error && jeepneys.length === 0) {
    return (
      <OceanBackground intensity={0.2}>
        <SafeAreaView className="flex-1">
          <View className="px-5 pt-6">
            <Text className="text-[11px] font-bold uppercase tracking-[1px] text-ocean-700">
              SMART QUEUE
            </Text>

            <Text className="mt-1 text-[28px] font-extrabold text-ink-dark">
              Dashboard
            </Text>

            <View className="mt-6 rounded-[26px] border border-red-100 bg-red-50 p-5">
              <View className="flex-row items-start">
                <CircleAlert size={21} color="#DC2626" strokeWidth={2.2} />

                <View className="ml-3 flex-1">
                  <Text className="text-[13px] font-extrabold text-red-700">
                    Unable to load queue
                  </Text>

                  <Text className="mt-1 text-[11px] leading-[17px] text-red-600">
                    {error}
                  </Text>

                  <Pressable
                    onPress={handleRefresh}
                    className="mt-4 self-start rounded-full bg-red-600 px-4 py-2.5"
                  >
                    <Text className="text-[10px] font-extrabold text-white">
                      Try again
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  /* ==========================================================
     EMPTY QUEUE
  ========================================================== */

  return (
    <OceanBackground intensity={0.2}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{
            paddingBottom: 130,
          }}
        >
          <View className="px-5 pt-4">
            {/* =================================================
                HEADER
            ================================================= */}

            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[1px] text-ocean-700">
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

                  <Text className="ml-1.5 text-[12px] font-medium text-ink-secondary">
                    Donsol → Daraga
                  </Text>
                </View>
              </View>

              {/* NOTIFICATION BELL */}
              <Pressable
                onPress={() => router.push("/commuter/(tabs)/notifications")}
                className="ml-3 h-[48px] w-[48px] items-center justify-center rounded-[17px] border border-white/90 bg-clay-surface shadow-clay-sm"
              >
                <Bell size={21} color={colors.primaryDark} strokeWidth={2.2} />

                {unreadNotificationCount > 0 ? (
                  <View className="absolute right-[-2px] top-[-2px] h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-500 px-1">
                    <Text className="text-[8px] font-extrabold text-white">
                      {unreadNotificationCount > 9
                        ? "9+"
                        : unreadNotificationCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </View>

            {/* =================================================
                GREETING
            ================================================= */}

            {profile?.display_name ? (
              <Text className="mt-4 text-[12px] font-medium text-ink-secondary">
                Welcome back,{" "}
                <Text className="font-extrabold text-ink-dark">
                  {profile.display_name}
                </Text>
              </Text>
            ) : null}

            {/* =================================================
                LIVE TERMINAL
            ================================================= */}

            <QueueSummaryCard
              queueCount={queueCount}
              terminalOneCount={terminalCounts.donsol}
              terminalTwoCount={terminalCounts.daraga}
            />

            {/* =================================================
                NEXT JEEPNEY
            ================================================= */}

            {nextJeepney ? (
              <NextJeepneyCard
                jeepney={nextJeepney}
                terminalName={getTerminalName(
                  nextJeepney.terminal_id,
                  terminalNames,
                )}
              />
            ) : (
              <View className="mt-4 rounded-[28px] border border-white/90 bg-clay-surface p-6 shadow-clay-floating">
                <View className="items-center">
                  <View className="h-[58px] w-[58px] items-center justify-center rounded-[19px] bg-ocean-100">
                    <BusFront
                      size={27}
                      color={colors.primaryDark}
                      strokeWidth={2}
                    />
                  </View>

                  <Text className="mt-4 text-[16px] font-extrabold text-ink-dark">
                    Queue is currently empty
                  </Text>

                  <Text className="mt-1 text-center text-[11px] leading-[17px] text-ink-secondary">
                    There are no jeepneys currently registered in the Smart
                    Queue.
                  </Text>
                </View>
              </View>
            )}

            {/* =================================================
                VIEW FULL QUEUE
            ================================================= */}

            <Pressable
              onPress={() => router.push("/commuter/(tabs)/queue")}
              className="mt-4 flex-row items-center justify-between rounded-[22px] border border-white/90 bg-clay-surface px-5 py-4 shadow-clay-sm"
            >
              <View className="flex-row items-center">
                <View className="h-[40px] w-[40px] items-center justify-center rounded-[13px] bg-ocean-100">
                  <BusFront
                    size={18}
                    color={colors.primaryDark}
                    strokeWidth={2.2}
                  />
                </View>

                <View className="ml-3">
                  <Text className="text-[12px] font-extrabold text-ink-dark">
                    View Full Queue
                  </Text>

                  <Text className="mt-0.5 text-[10px] text-ink-secondary">
                    See all {queueCount} jeepneys
                  </Text>
                </View>
              </View>

              <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-ocean-50">
                <ArrowRight
                  size={17}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />
              </View>
            </Pressable>

            {/* =================================================
                RECENT ACTIVITY
            ================================================= */}

            <View className="mt-7">
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="text-[18px] font-extrabold text-ink-dark">
                    Recent Activity
                  </Text>

                  <Text className="mt-1 text-[10px] text-ink-secondary">
                    Latest changes in the jeepney queue
                  </Text>
                </View>

                <View className="rounded-full bg-ocean-100 px-3 py-1.5">
                  <Text className="text-[9px] font-extrabold text-ocean-700">
                    LIVE
                  </Text>
                </View>
              </View>

              <ActivityCard
                activities={activities}
                terminalNames={terminalNames}
              />
            </View>

            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            <View className="mt-7">
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="text-[18px] font-extrabold text-ink-dark">
                    Notifications
                  </Text>

                  <Text className="mt-1 text-[10px] text-ink-secondary">
                    Important Smart Queue updates
                  </Text>
                </View>
              </View>

              <NotificationPreview
                notifications={notifications}
                unreadCount={unreadNotificationCount}
                onPress={() => router.push("/commuter/(tabs)/notifications")}
              />
            </View>

            {/* =================================================
                LIVE UPDATE FOOTER
            ================================================= */}

            <View className="mt-7 items-center pb-3">
              <View className="flex-row items-center">
                <View className="h-[8px] w-[8px] rounded-full bg-green-500" />

                <Text className="ml-2 text-[9px] font-semibold text-ink-muted">
                  Live queue updates enabled
                </Text>
              </View>

              {lastUpdated ? (
                <Text className="mt-1 text-[8px] text-ink-muted">
                  Last updated{" "}
                  {lastUpdated.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </Text>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </OceanBackground>
  );
}
