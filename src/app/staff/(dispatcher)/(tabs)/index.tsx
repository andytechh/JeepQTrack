import {
  AlertTriangle,
  Bell,
  BusFront,
  CheckCircle2,
  Clock3,
  ListStart,
  MapPin,
  MessageCircle,
  RefreshCw,
  Route,
  Send,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react-native";

import { useRouter } from "expo-router";
import { useState } from "react";

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

import JeepneyImage from "../../../../src/shared/components/jeepney/JeepneyImage";

import OceanBackground from "../../../../src/shared/components/clay/OceanBackground";
import { colors } from "../../../../src/shared/constants/theme";
import { useDispatcherDashboard } from "../../../../src/shared/hooks/dispatcher/useDispatcherDashboard";
import { useNotifications } from "../../../../src/shared/hooks/useNotification";
import { useAuthStore } from "../../../../src/shared/store/authStore";

export default function DispatcherDashboardScreen() {
  const router = useRouter();

  const {
    terminalName,
    jeepneys,
    tripLogs,
    nextToDispatch,
    stats,
    loading,
    refreshing,
    error,
    refresh,
    notifyNextDriver,
  } = useDispatcherDashboard();

  const userId = useAuthStore((state) => state.user?.uid ?? null);
  const { unreadCount } = useNotifications(userId);

  const [notifying, setNotifying] = useState(false);

  const handleNotifyNext = async () => {
    if (!nextToDispatch) {
      Alert.alert(
        "Queue Empty",
        "There is currently no jeepney waiting for dispatch.",
      );
      return;
    }

    Alert.alert(
      "Notify Driver",
      `${nextToDispatch.plate_number} is next in the queue. Notify the driver?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Notify",
          onPress: async () => {
            try {
              setNotifying(true);

              await notifyNextDriver();

              Alert.alert(
                "Notification Sent",
                `${nextToDispatch.plate_number} has been notified.`,
              );
            } catch (err) {
              Alert.alert(
                "Unable to Notify",
                "The driver notification could not be sent.",
              );
            } finally {
              setNotifying(false);
            }
          },
        },
      ],
    );
  };

  const handleNotifications = () => {
    router.push("/staff/(dispatcher)/notifications");
  };

  if (loading) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <View className="h-[76px] w-[76px] items-center justify-center rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </View>

            <Text className="mt-4 text-[15px] font-extrabold text-ink-dark">
              Loading dashboard
            </Text>

            <Text className="mt-1 text-center text-[11px] text-ink-secondary">
              Getting the latest terminal information...
            </Text>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  return (
    <OceanBackground intensity={0.28}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primaryDark}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 135,
          }}
        >
          <DashboardHeader
            terminalName={terminalName}
            unreadCount={unreadCount}
            onNotifications={handleNotifications}
          />

          {error && <ErrorCard message={error} onRetry={refresh} />}

          <View className="mt-5">
            <View className="flex-row">
              <View className="flex-1">
                <StatCard
                  title="Total"
                  value={stats.total}
                  subtitle="Jeepneys"
                  icon={
                    <BusFront
                      size={19}
                      color={colors.primaryDark}
                      strokeWidth={2.4}
                    />
                  }
                  iconBackground="#E0F2FE"
                />
              </View>

              <View className="ml-3 flex-1">
                <StatCard
                  title="Online"
                  value={stats.online}
                  subtitle="Active fleet"
                  icon={
                    <TrendingUp size={19} color="#059669" strokeWidth={2.4} />
                  }
                  iconBackground="#D1FAE5"
                />
              </View>
            </View>

            <View className="mt-3 flex-row">
              <View className="flex-1">
                <StatCard
                  title="Waiting"
                  value={stats.waiting}
                  subtitle="At terminal"
                  icon={<Clock3 size={19} color="#B45309" strokeWidth={2.4} />}
                  iconBackground="#FEF3C7"
                />
              </View>

              <View className="ml-3 flex-1">
                <StatCard
                  title="Queue"
                  value={stats.queue}
                  subtitle="Queued"
                  icon={<Users size={19} color="#4338CA" strokeWidth={2.4} />}
                  iconBackground="#E0E7FF"
                />
              </View>
            </View>
          </View>

          <SectionHeader
            title="Next to Dispatch"
            subtitle="First jeepney in the terminal queue"
          />

          {nextToDispatch ? (
            <NextDispatchCard
              jeepney={nextToDispatch}
              notifying={notifying}
              onNotify={handleNotifyNext}
            />
          ) : (
            <EmptyCard
              icon={
                <CheckCircle2 size={24} color="#059669" strokeWidth={2.4} />
              }
              title="Queue is clear"
              message="No jeepney is currently waiting for dispatch."
            />
          )}

          <SectionHeader title="Quick Actions" subtitle="Dispatcher controls" />

          <View className="flex-row flex-wrap justify-between">
            <ActionCard
              title="Queue"
              subtitle="Manage queue"
              icon={<ListStart size={20} color="#FFFFFF" strokeWidth={2.4} />}
              primary
              onPress={() => router.push("/staff/(dispatcher)/(tabs)/queue")}
            />

            <ActionCard
              title="Live Map"
              subtitle="Track fleet"
              icon={
                <MapPin
                  size={20}
                  color={colors.primaryDark}
                  strokeWidth={2.4}
                />
              }
              onPress={() => router.push("/staff/(dispatcher)/(tabs)/map")}
            />

            <ActionCard
              title="Chat"
              subtitle="Message staff"
              icon={
                <MessageCircle size={20} color="#4338CA" strokeWidth={2.4} />
              }
              onPress={() => router.push("/staff/(dispatcher)/(tabs)/chat")}
            />

            <ActionCard
              title="Settings"
              subtitle="Preferences"
              icon={<Settings size={20} color="#64748B" strokeWidth={2.4} />}
              onPress={() => router.push("/staff/(dispatcher)/(tabs)/profile")}
            />
          </View>

          <SectionHeader
            title="Jeepney Queue"
            subtitle={`Jeepneys assigned to ${terminalName}`}
            count={jeepneys.length}
          />

          {jeepneys.length === 0 ? (
            <EmptyCard
              icon={
                <BusFront
                  size={24}
                  color={colors.primaryDark}
                  strokeWidth={2.4}
                />
              }
              title="No jeepneys"
              message={`There are currently no jeepneys assigned to the ${terminalName} terminal.`}
            />
          ) : (
            <View>
              {jeepneys.slice(0, 6).map((jeepney, index) => (
                <JeepneyCard
                  key={jeepney.id}
                  jeepney={jeepney}
                  index={index}
                  onPress={() =>
                    router.push(
                      `/staff/(dispatcher)/jeepney/${jeepney.id}` as any,
                    )
                  }
                />
              ))}

              {jeepneys.length > 6 && (
                <Pressable
                  onPress={() =>
                    router.push("/staff/(dispatcher)/(tabs)/queue")
                  }
                  className="mt-1 h-[44px] items-center justify-center rounded-full border border-white/90 bg-white/70"
                >
                  <Text className="text-[11px] font-extrabold text-ocean-700">
                    View Full Queue
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          <SectionHeader
            title="Recent Trips"
            subtitle="Latest terminal activity"
            count={tripLogs.length}
          />

          {tripLogs.length === 0 ? (
            <EmptyCard
              icon={<Route size={24} color="#4338CA" strokeWidth={2.4} />}
              title="No recent trips"
              message="Trip activity will appear here once trips are recorded."
            />
          ) : (
            <View className="overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface">
              {tripLogs.slice(0, 6).map((trip, index) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  last={index === Math.min(tripLogs.length, 6) - 1}
                />
              ))}
            </View>
          )}

          <SectionHeader
            title="Terminal Overview"
            subtitle="Current fleet status"
          />

          <TerminalOverview stats={stats} />

          <View className="mt-5 flex-row items-center justify-center">
            <View className="h-[7px] w-[7px] rounded-full bg-emerald-500" />

            <Text className="ml-2 text-[10px] font-semibold text-ink-muted">
              Live terminal data
            </Text>

            <View className="mx-2 h-[3px] w-[3px] rounded-full bg-slate-300" />

            <Text className="text-[10px] font-medium text-ink-muted">
              Pull to refresh
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </OceanBackground>
  );
}

function DashboardHeader({
  terminalName,
  unreadCount,
  onNotifications,
}: {
  terminalName: string;
  unreadCount: number;
  onNotifications: () => void;
}) {
  return (
    <View className="pt-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-ocean-700">
            SMART QUEUE
          </Text>

          <Text className="mt-0.5 text-[26px] font-extrabold text-ink-dark">
            Dispatcher
          </Text>
        </View>

        <Pressable
          onPress={onNotifications}
          className="relative h-[48px] w-[48px] items-center justify-center rounded-full border border-white/90 bg-clay-surface shadow-clay-sm"
          hitSlop={10}
        >
          <Bell size={21} color={colors.primaryDark} strokeWidth={2.2} />

          {unreadCount > 0 && (
            <View className="absolute right-[-1px] top-[-2px] min-h-[20px] min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1">
              <Text className="text-[9px] font-extrabold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <View className="mt-3 flex-row items-center">
        <View className="h-[8px] w-[8px] rounded-full bg-emerald-500" />

        <Text className="ml-2 text-[11px] font-semibold text-ink-secondary">
          {terminalName} terminal monitoring active
        </Text>
      </View>
    </View>
  );
}

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="mt-5 rounded-[24px] border border-red-100 bg-white/90 p-5">
      <View className="flex-row items-center">
        <View className="h-[44px] w-[44px] items-center justify-center rounded-[15px] bg-red-50">
          <AlertTriangle size={21} color="#DC2626" strokeWidth={2.4} />
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-[14px] font-extrabold text-ink-dark">
            Dashboard data unavailable
          </Text>

          <Text className="mt-1 text-[11px] leading-[17px] text-ink-secondary">
            {message}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onRetry}
        className="mt-4 h-[44px] flex-row items-center justify-center rounded-full bg-ocean-400"
      >
        <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />

        <Text className="ml-2 text-[12px] font-extrabold text-white">
          Retry
        </Text>
      </Pressable>
    </View>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBackground,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  iconBackground: string;
}) {
  return (
    <View
      className="rounded-[23px] border border-white/90 bg-clay-surface p-4"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.055,
        shadowRadius: 9,
        elevation: 2,
      }}
    >
      <View
        className="h-[40px] w-[40px] items-center justify-center rounded-[14px]"
        style={{
          backgroundColor: iconBackground,
        }}
      >
        {icon}
      </View>

      <Text className="mt-4 text-[10px] font-bold uppercase tracking-[0.8px] text-ink-muted">
        {title}
      </Text>

      <Text className="mt-0.5 text-[27px] font-extrabold text-ink-dark">
        {value}
      </Text>

      <Text className="mt-0.5 text-[10px] font-semibold text-ink-secondary">
        {subtitle}
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count?: number;
}) {
  return (
    <View className="mb-3 mt-7 flex-row items-end justify-between">
      <View className="flex-1">
        <Text className="text-[16px] font-extrabold text-ink-dark">
          {title}
        </Text>

        <Text className="mt-0.5 text-[10px] font-medium text-ink-muted">
          {subtitle}
        </Text>
      </View>

      {count !== undefined && (
        <View className="rounded-full bg-ocean-100 px-3 py-1.5">
          <Text className="text-[10px] font-extrabold text-ocean-700">
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}

function NextDispatchCard({
  jeepney,
  notifying,
  onNotify,
}: {
  jeepney: any;
  notifying: boolean;
  onNotify: () => void;
}) {
  const occupancy = (jeepney.front_count || 0) + (jeepney.rear_count || 0);

  const capacity = Math.max(jeepney.capacity || 1, 1);

  const percentage = Math.min(100, Math.round((occupancy / capacity) * 100));

  return (
    <View
      className="rounded-[26px] border border-white/90 bg-clay-surface p-5"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center">
        <JeepneyImage
          imageUrl={jeepney.image_url}
          size={52}
          rounded={17}
          iconSize={25}
        />

        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-extrabold text-ink-dark">
            {jeepney.plate_number}
          </Text>

          <Text className="mt-0.5 text-[11px] font-medium text-ink-secondary">
            {jeepney.driver_name || "No driver assigned"}
          </Text>
        </View>

        <View className="rounded-full bg-ocean-100 px-3 py-1.5">
          <Text className="text-[9px] font-extrabold uppercase text-ocean-700">
            Next
          </Text>
        </View>
      </View>

      <View className="mt-5 flex-row">
        <InfoItem label="Queue" value={`#${jeepney.queue_position ?? "—"}`} />

        <InfoItem label="Occupancy" value={`${occupancy}/${capacity}`} />

        <InfoItem label="Bracket" value={String(jeepney.bracket ?? "—")} />
      </View>

      <View className="mt-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] font-bold uppercase tracking-[0.6px] text-ink-muted">
            Occupancy
          </Text>

          <Text className="text-[11px] font-extrabold text-ink-dark">
            {percentage}%
          </Text>
        </View>

        <View className="mt-2 h-[9px] overflow-hidden rounded-full bg-slate-100">
          <View
            className="h-full rounded-full bg-ocean-400"
            style={{
              width: `${percentage}%`,
            }}
          />
        </View>
      </View>

      <Pressable
        disabled={notifying}
        onPress={onNotify}
        className="mt-5 h-[46px] flex-row items-center justify-center rounded-full bg-ocean-400"
      >
        {notifying ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Send size={17} color="#FFFFFF" strokeWidth={2.4} />

            <Text className="ml-2 text-[12px] font-extrabold text-white">
              Notify Driver
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[10px] font-semibold uppercase tracking-[0.6px] text-ink-muted">
        {label}
      </Text>

      <Text className="mt-1 text-[12px] font-bold text-ink-dark">{value}</Text>
    </View>
  );
}

function ActionCard({
  title,
  subtitle,
  icon,
  primary = false,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-3 w-[48%] rounded-[22px] border p-4 ${
        primary
          ? "border-ocean-400 bg-ocean-400"
          : "border-white/90 bg-clay-surface"
      }`}
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.045,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <View
        className={`h-[40px] w-[40px] items-center justify-center rounded-[14px] ${
          primary ? "bg-white/20" : "bg-ocean-100"
        }`}
      >
        {icon}
      </View>

      <Text
        className={`mt-3 text-[12px] font-extrabold ${
          primary ? "text-white" : "text-ink-dark"
        }`}
      >
        {title}
      </Text>

      <Text
        className={`mt-0.5 text-[9px] font-medium ${
          primary ? "text-white/80" : "text-ink-muted"
        }`}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function JeepneyCard({
  jeepney,
  index,
  onPress,
}: {
  jeepney: any;
  index: number;
  onPress: () => void;
}) {
  const occupancy = (jeepney.front_count || 0) + (jeepney.rear_count || 0);

  const capacity = Math.max(jeepney.capacity || 1, 1);

  const percentage = Math.min(100, Math.round((occupancy / capacity) * 100));

  const status = jeepney.status?.replace(/_/g, " ") || "unknown";

  const statusStyle =
    jeepney.status === "en_route"
      ? {
          background: "bg-indigo-100",
          text: "text-indigo-700",
        }
      : jeepney.status === "loading"
        ? {
            background: "bg-amber-100",
            text: "text-amber-700",
          }
        : jeepney.status === "waiting"
          ? {
              background: "bg-sky-100",
              text: "text-sky-700",
            }
          : {
              background: "bg-emerald-100",
              text: "text-emerald-700",
            };

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-[23px] border border-white/90 bg-clay-surface p-4"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <View className="flex-row items-center">
        <JeepneyImage
          imageUrl={jeepney.image_url}
          size={43}
          rounded={14}
          iconSize={21}
        />

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-[13px] font-extrabold text-ink-dark"
          >
            {jeepney.plate_number}
          </Text>

          <Text
            numberOfLines={1}
            className="mt-0.5 text-[10px] font-medium text-ink-secondary"
          >
            {jeepney.driver_name || "No driver assigned"}
          </Text>
        </View>

        <View className="items-end">
          <View
            className={`rounded-full px-2.5 py-1 ${statusStyle.background}`}
          >
            <Text
              className={`text-[8px] font-extrabold uppercase ${statusStyle.text}`}
            >
              {status}
            </Text>
          </View>

          <Text className="mt-1 text-[9px] font-medium text-ink-muted">
            {occupancy}/{capacity}
          </Text>
        </View>
      </View>

      <View className="mt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
            Occupancy
          </Text>

          <Text className="text-[10px] font-extrabold text-ink-dark">
            {percentage}%
          </Text>
        </View>

        <View className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-slate-100">
          <View
            className="h-full rounded-full bg-ocean-400"
            style={{
              width: `${percentage}%`,
            }}
          />
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="h-[6px] w-[6px] rounded-full bg-emerald-500" />

          <Text className="ml-2 text-[9px] font-medium text-ink-muted">
            Bracket {jeepney.bracket ?? "—"}
          </Text>
        </View>

        <View className="flex-row items-center">
          {(jeepney.status === "waiting" || jeepney.status === "loading") &&
          jeepney.queue_position != null ? (
            <View className="mr-3 rounded-full bg-ocean-100 px-2.5 py-1">
              <Text className="text-[8px] font-extrabold text-ocean-700">
                Queue #{jeepney.queue_position}
              </Text>
            </View>
          ) : (
            <View className="mr-3 rounded-full bg-slate-100 px-2.5 py-1">
              <Text className="text-[8px] font-extrabold text-slate-500">
                No queue number
              </Text>
            </View>
          )}

          <Text className="text-[9px] font-semibold text-ocean-700">
            View details
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function TripCard({ trip, last }: { trip: any; last: boolean }) {
  const status = trip.status?.replace(/_/g, " ") || "unknown";

  const completed = trip.status === "completed";

  return (
    <View className={`p-4 ${!last ? "border-b border-slate-100" : ""}`}>
      <View className="flex-row items-center">
        <View className="h-[40px] w-[40px] items-center justify-center rounded-[13px] bg-indigo-100">
          <Route size={18} color="#4338CA" strokeWidth={2.3} />
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-[12px] font-extrabold text-ink-dark">
            {trip.jeepney_plate}
          </Text>

          <Text
            numberOfLines={1}
            className="mt-0.5 text-[9px] text-ink-secondary"
          >
            {trip.driver_name || "Unknown driver"}
          </Text>
        </View>

        <View
          className={`rounded-full px-2.5 py-1 ${
            completed
              ? "bg-emerald-100"
              : trip.status === "in_progress"
                ? "bg-indigo-100"
                : "bg-red-100"
          }`}
        >
          <Text
            className={`text-[8px] font-extrabold uppercase ${
              completed
                ? "text-emerald-700"
                : trip.status === "in_progress"
                  ? "text-indigo-700"
                  : "text-red-700"
            }`}
          >
            {status}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center">
        <Text className="text-[9px] font-medium text-ink-muted">
          {trip.route || "Donsol ↔ Daraga"}
        </Text>

        <View className="mx-2 h-[3px] w-[3px] rounded-full bg-slate-300" />

        <Text className="text-[9px] font-medium text-ink-muted">
          {trip.passengers || 0} passengers
        </Text>
      </View>
    </View>
  );
}

function EmptyCard({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <View className="items-center rounded-[25px] border border-white/90 bg-white/70 px-6 py-7">
      <View className="h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-ocean-100">
        {icon}
      </View>

      <Text className="mt-3 text-[14px] font-extrabold text-ink-dark">
        {title}
      </Text>

      <Text className="mt-1 max-w-[280px] text-center text-[10px] leading-[16px] text-ink-secondary">
        {message}
      </Text>
    </View>
  );
}

function TerminalOverview({ stats }: { stats: any }) {
  return (
    <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
      <OverviewRow
        icon={<CheckCircle2 size={17} color="#059669" strokeWidth={2.3} />}
        label="Online fleet"
        value={stats.online}
      />

      <OverviewRow
        icon={<Clock3 size={17} color="#0284C7" strokeWidth={2.3} />}
        label="Waiting"
        value={stats.waiting}
      />

      <OverviewRow
        icon={<Users size={17} color="#B45309" strokeWidth={2.3} />}
        label="Loading"
        value={stats.loading}
      />

      <OverviewRow
        icon={<Route size={17} color="#4338CA" strokeWidth={2.3} />}
        label="En route"
        value={stats.enRoute}
      />

      <OverviewRow
        icon={<BusFront size={17} color="#64748B" strokeWidth={2.3} />}
        label="Inactive"
        value={stats.inactive}
        last
      />
    </View>
  );
}

function OverviewRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center py-3 ${
        !last ? "border-b border-slate-100" : ""
      }`}
    >
      <View className="h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-white">
        {icon}
      </View>

      <Text className="ml-3 flex-1 text-[11px] font-semibold text-ink-secondary">
        {label}
      </Text>

      <Text className="text-[13px] font-extrabold text-ink-dark">{value}</Text>
    </View>
  );
}
