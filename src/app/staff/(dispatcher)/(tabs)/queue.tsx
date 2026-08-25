import { router } from "expo-router";
import {
  ArrowLeft,
  Bell,
  Bus,
  CheckCircle2,
  Clock,
  History,
  MapPin,
  Search,
  ShieldCheck,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  SectionList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  QueueJeepney,
  RecentTrip,
  useDispatcherQueue,
} from "@/src/shared/hooks/dispatcher/useDispatcherQueue";

import { DispatcherQueueService } from "@/src/shared/services/dispatcher/DispatcherQueueService";

import ClayButton from "@/src/shared/components/clay/ClayButton";
import { ClayCard } from "@/src/shared/components/clay/ClayCard";
import ClayStatCard from "@/src/shared/components/clay/ClayStatCard";

import { theme } from "@/src/shared/constants/theme";
import { useTheme } from "@/src/shared/context/ThemeContext";
import { useAuthStore } from "@/src/shared/store/authStore";

const LOADING_DURATION_MS = 30 * 60 * 1000;

function useNowTick(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

function formatCountdown(ms: number) {
  if (ms <= 0) {
    return "Ready";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function LoadingTimer({ item, now }: { item: QueueJeepney; now: number }) {
  const { isDark } = useTheme();

  if (item.status !== "loading" || !item.loading_started_at) {
    return null;
  }

  const endTime = item.loading_ends_at
    ? new Date(item.loading_ends_at).getTime()
    : new Date(item.loading_started_at).getTime() + LOADING_DURATION_MS;

  const remaining = endTime - now;

  const isUrgent = remaining > 0 && remaining < 5 * 60 * 1000;

  const isOverdue = remaining <= 0;

  const backgroundClass = isOverdue
    ? isDark
      ? "bg-red-500/15"
      : "bg-red-50"
    : isUrgent
      ? isDark
        ? "bg-amber-500/15"
        : "bg-amber-50"
      : isDark
        ? "bg-sky-500/15"
        : "bg-sky-50";

  const textColor = isOverdue ? "#EF4444" : isUrgent ? "#F59E0B" : "#0EA5E9";

  return (
    <View
      className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${backgroundClass}`}
    >
      <Clock size={12} color={textColor} />

      <Text
        style={{
          color: textColor,
          fontSize: 11,
          fontWeight: "800",
        }}
      >
        {isOverdue ? "Ready" : formatCountdown(remaining)}
      </Text>
    </View>
  );
}

function TerminalHeader({
  title,
  subtitle,
  isMine,
}: {
  title: string;
  subtitle: string;
  isMine: boolean;
}) {
  const { isDark } = useTheme();

  return (
    <ClayCard
      padding={12}
      radiusSize="xl"
      shadow="small"
      style={{
        marginTop: 8,
        marginBottom: 12,
      }}
    >
      <View className="flex-row items-center">
        <View
          className={`h-10 w-10 items-center justify-center rounded-[16px] ${
            isMine ? "bg-ocean-100" : isDark ? "bg-slate-800" : "bg-slate-100"
          }`}
        >
          {isMine ? (
            <MapPin size={19} color="#0EA5E9" />
          ) : (
            <Bus size={19} color={isDark ? "#94A3B8" : "#64748B"} />
          )}
        </View>

        <View className="ml-3 flex-1">
          <Text
            className={`text-sm font-extrabold ${
              isDark ? "text-white" : "text-ink-dark"
            }`}
          >
            {title}
          </Text>

          <Text
            className={`mt-0.5 text-[11px] ${
              isDark ? "text-slate-400" : "text-ink-secondary"
            }`}
          >
            {subtitle}
          </Text>
        </View>

        {isMine ? (
          <View className="flex-row items-center rounded-full bg-ocean-100 px-2.5 py-1">
            <ShieldCheck size={12} color="#0EA5E9" />

            <Text className="ml-1 text-[10px] font-extrabold text-sky-500">
              MY TERMINAL
            </Text>
          </View>
        ) : (
          <View
            className={`rounded-full px-2.5 py-1 ${
              isDark ? "bg-slate-800" : "bg-slate-100"
            }`}
          >
            <Text
              className={`text-[10px] font-extrabold ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              MONITORING
            </Text>
          </View>
        )}
      </View>
    </ClayCard>
  );
}

function QueueItemCard({
  item,
  now,
  onAlert,
  alerting,
}: {
  item: QueueJeepney;
  now: number;
  onAlert: (item: QueueJeepney) => void;
  alerting: boolean;
}) {
  const { isDark } = useTheme();

  const isLoading = item.status === "loading";

  return (
    <ClayCard
      padding={16}
      radiusSize="xl"
      shadow="small"
      style={{
        marginBottom: 12,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center">
          <View
            className={`h-11 w-11 items-center justify-center rounded-[17px] ${
              item.is_my_terminal
                ? isLoading
                  ? "bg-ocean-100"
                  : "bg-amber-100"
                : isDark
                  ? "bg-slate-800"
                  : "bg-slate-100"
            }`}
          >
            <Text
              className={`text-sm font-extrabold ${
                item.is_my_terminal
                  ? isLoading
                    ? "text-sky-500"
                    : "text-amber-500"
                  : isDark
                    ? "text-slate-400"
                    : "text-slate-500"
              }`}
            >
              {item.queue_position ?? "-"}
            </Text>
          </View>

          <View className="ml-3 flex-1">
            <Text
              className={`font-extrabold ${
                isDark ? "text-white" : "text-ink-dark"
              }`}
            >
              {item.plate_number}

              {item.jeep_name ? `  ·  ${item.jeep_name}` : ""}
            </Text>

            <Text
              className={`mt-0.5 text-xs ${
                isDark ? "text-slate-400" : "text-ink-secondary"
              }`}
            >
              {item.driver_name ?? "No driver assigned"}
            </Text>

            <Text
              className={`mt-1 text-[11px] ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {item.current_occupancy}/{item.capacity} passengers
              {" · "}
              Bracket {item.assigned_bracket_number}
            </Text>
          </View>
        </View>

        <View className="items-end gap-1.5">
          <View
            className={`rounded-full px-2.5 py-1 ${
              isLoading ? "bg-sky-500/10" : "bg-amber-500/10"
            }`}
          >
            <Text
              className={`text-[10px] font-extrabold uppercase ${
                isLoading ? "text-sky-500" : "text-amber-500"
              }`}
            >
              {item.status}
            </Text>
          </View>

          <LoadingTimer item={item} now={now} />
        </View>
      </View>

      {item.is_my_terminal ? (
        <ClayButton
          title="Alert Driver"
          onPress={() => onAlert(item)}
          loading={alerting}
          disabled={alerting}
          className="mt-4"
        />
      ) : (
        <View
          className={`mt-4 flex-row items-center justify-center rounded-full border px-4 py-3 ${
            isDark
              ? "border-slate-700 bg-slate-800"
              : "border-white/80 bg-slate-100"
          }`}
        >
          <ShieldCheck size={15} color={isDark ? "#64748B" : "#94A3B8"} />

          <Text
            className={`ml-2 text-xs font-bold ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Monitoring only
          </Text>
        </View>
      )}
    </ClayCard>
  );
}

function RecentTripRow({ item }: { item: RecentTrip }) {
  const { isDark } = useTheme();

  return (
    <View
      className={`px-4 py-3 ${
        isDark ? "border-slate-800" : "border-slate-100"
      } border-b`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text
            className={`font-extrabold ${
              isDark ? "text-white" : "text-ink-dark"
            }`}
          >
            {item.plate_number}
          </Text>

          <Text
            className={`mt-0.5 text-xs ${
              isDark ? "text-slate-400" : "text-ink-secondary"
            }`}
          >
            {item.driver_name ?? "Unknown"}
            {" · "}
            {item.route}
          </Text>
        </View>

        <View className="items-end">
          <Text
            className={`text-xs ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {new Date(item.departure_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>

          <Text
            className={`mt-0.5 text-[10px] ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {item.passengers} pax
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function DispatcherQueueScreen() {
  const { isDark } = useTheme();

  const { user } = useAuthStore();

  const now = useNowTick();

  const {
    myTerminal,
    myTerminalQueue,
    otherTerminalQueue,
    recentTrips,
    stats,
    loading,
    refreshing,
    error,
    refresh,
  } = useDispatcherQueue();

  const [alertingId, setAlertingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const handleAlert = useCallback(
    (item: QueueJeepney) => {
      if (!user?.id) {
        Alert.alert(
          "Unable to Alert",
          "Your dispatcher account could not be identified.",
        );

        return;
      }

      if (!item.is_my_terminal) {
        Alert.alert(
          "Not Allowed",
          "You can only alert jeepneys assigned to your terminal.",
        );

        return;
      }

      Alert.alert(
        "Alert Driver",
        `Send a queue alert to ${item.plate_number}${
          item.driver_name ? ` (${item.driver_name})` : ""
        }?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Send Alert",
            onPress: async () => {
              try {
                setAlertingId(item.id);

                const result = await DispatcherQueueService.alertDriver(
                  user.id,
                  item.id,
                );

                if (!result.success) {
                  Alert.alert(
                    "Alert Failed",
                    result.error ?? "Unable to send alert.",
                  );

                  return;
                }

                Alert.alert(
                  "Alert Sent",
                  `${item.plate_number} has been alerted.`,
                );
              } catch (err: any) {
                Alert.alert(
                  "Alert Failed",
                  err?.message ?? "Unable to send alert.",
                );
              } finally {
                setAlertingId(null);
              }
            },
          },
        ],
      );
    },
    [user?.id],
  );

  const filteredMyQueue = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return Array.isArray(myTerminalQueue) ? myTerminalQueue : [];
    }

    return (Array.isArray(myTerminalQueue) ? myTerminalQueue : []).filter(
      (item) =>
        item.plate_number.toLowerCase().includes(query) ||
        (item.driver_name ?? "").toLowerCase().includes(query),
    );
  }, [myTerminalQueue, searchQuery]);

  const filteredOtherQueue = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const queue = Array.isArray(otherTerminalQueue) ? otherTerminalQueue : [];

    if (!query) {
      return queue;
    }

    return queue.filter(
      (item) =>
        item.plate_number.toLowerCase().includes(query) ||
        (item.driver_name ?? "").toLowerCase().includes(query),
    );
  }, [otherTerminalQueue, searchQuery]);

  const sections = useMemo(() => {
    const result: {
      title: string;
      subtitle: string;
      isMine: boolean;
      data: QueueJeepney[];
    }[] = [];

    if (myTerminal) {
      result.push({
        title: myTerminal.name,

        subtitle:
          `Terminal ${myTerminal.terminal_number} · ` +
          `Bracket ${myTerminal.bracket_number}`,

        isMine: true,

        data: filteredMyQueue,
      });
    }

    const otherTerminals = new Map<string, QueueJeepney[]>();

    filteredOtherQueue.forEach((item) => {
      const terminalId = item.assigned_terminal_id;

      const existing = otherTerminals.get(terminalId) ?? [];

      existing.push(item);

      otherTerminals.set(terminalId, existing);
    });

    Array.from(otherTerminals.entries())
      .sort((a, b) => {
        const aNumber = a[1][0]?.assigned_terminal_number ?? 0;

        const bNumber = b[1][0]?.assigned_terminal_number ?? 0;

        return aNumber - bNumber;
      })
      .forEach(([, data]) => {
        const first = data[0];

        if (!first) {
          return;
        }

        result.push({
          title: first.assigned_terminal_name,

          subtitle:
            `Terminal ${first.assigned_terminal_number} · ` +
            `Bracket ${first.assigned_bracket_number}`,

          isMine: false,

          data,
        });
      });

    return result;
  }, [myTerminal, filteredMyQueue, filteredOtherQueue]);

  if (loading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-slate-950" : "bg-clay-background"
        }`}
      >
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />

        <Text
          className={`mt-3 text-sm ${
            isDark ? "text-slate-400" : "text-ink-secondary"
          }`}
        >
          Loading queue...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-slate-950" : "bg-clay-background"}`}
    >
      <View className="px-4 pt-3">
        <ClayCard padding={14} radiusSize="xl" shadow="small">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-ocean-100"
              activeOpacity={0.8}
            >
              <ArrowLeft size={21} color="#0EA5E9" />
            </TouchableOpacity>

            <View className="flex-1">
              <Text
                className={`text-xl font-extrabold ${
                  isDark ? "text-white" : "text-ink-dark"
                }`}
              >
                Queue Management
              </Text>

              <Text
                className={`mt-0.5 text-xs ${
                  isDark ? "text-slate-400" : "text-ink-secondary"
                }`}
              >
                Monitor both terminals
              </Text>
            </View>

            <View className="flex-row items-center rounded-full bg-emerald-500/10 px-2.5 py-1.5">
              <CheckCircle2 size={13} color="#10B981" />

              <Text className="ml-1 text-[10px] font-extrabold text-emerald-500">
                AUTO
              </Text>
            </View>
          </View>
        </ClayCard>
      </View>

      <View className="px-4 pt-3">
        <View className="flex-row gap-3">
          <ClayStatCard
            label="My Queue"
            value={stats.myTerminal}
            subtitle="My terminal"
            icon={<MapPin size={19} color="#0EA5E9" />}
          />

          <ClayStatCard
            label="Waiting"
            value={stats.waiting}
            subtitle="Awaiting load"
            icon={<Clock size={19} color="#F59E0B" />}
          />
        </View>

        <View className="mt-3 flex-row gap-3">
          <ClayStatCard
            label="Loading"
            value={stats.loading}
            subtitle="Currently loading"
            icon={<Bus size={19} color="#0EA5E9" />}
          />

          <ClayStatCard
            label="Other"
            value={stats.otherTerminal}
            subtitle="Monitoring"
            icon={<ShieldCheck size={19} color="#64748B" />}
          />
        </View>
      </View>

      <View className="px-4 pt-3">
        <ClayCard padding={12} radiusSize="xl" shadow="small">
          <View className="flex-row items-center">
            <View className="h-9 w-9 items-center justify-center rounded-[14px] bg-ocean-100">
              <ShieldCheck size={18} color="#0EA5E9" />
            </View>

            <View className="ml-3 flex-1">
              <Text
                className={`text-sm font-extrabold ${
                  isDark ? "text-white" : "text-ink-dark"
                }`}
              >
                {myTerminal?.name ?? "Unassigned Terminal"}
              </Text>

              <Text
                className={`mt-0.5 text-[11px] ${
                  isDark ? "text-slate-400" : "text-ink-secondary"
                }`}
              >
                Terminal {myTerminal?.terminal_number ?? "-"} · Bracket{" "}
                {myTerminal?.bracket_number ?? "-"}
              </Text>
            </View>
          </View>
        </ClayCard>

        <View className="mt-3 flex-row items-center rounded-[20px] border border-white/70 bg-ocean-100 px-3 py-2.5">
          <Bell size={15} color="#0EA5E9" />

          <Text className="ml-2 flex-1 text-xs font-semibold text-sky-600">
            You can alert drivers in your terminal. Dispatching is fully
            automatic.
          </Text>
        </View>

        <ClayCard
          padding={11}
          radiusSize="xl"
          shadow="small"
          style={{
            marginTop: 12,
          }}
        >
          <View className="flex-row items-center">
            <Search size={17} color="#94A3B8" />

            <TextInput
              className={`ml-2 flex-1 text-sm ${
                isDark ? "text-white" : "text-ink-dark"
              }`}
              placeholder="Search plate or driver..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={17} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </ClayCard>
      </View>

      {error && (
        <View className="mx-4 mt-3 rounded-[20px] border border-red-500/20 bg-red-500/10 p-3">
          <Text className="text-sm font-semibold text-red-500">{error}</Text>

          <TouchableOpacity
            onPress={refresh}
            className="mt-2 self-start rounded-full bg-red-500 px-4 py-2"
          >
            <Text className="text-xs font-bold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.id}-${item.assigned_terminal_id}`}
        renderSectionHeader={({ section }) => (
          <TerminalHeader
            title={section.title}
            subtitle={section.subtitle}
            isMine={section.isMine}
          />
        )}
        renderItem={({ item }) => (
          <QueueItemCard
            item={item}
            now={now}
            onAlert={handleAlert}
            alerting={alertingId === item.id}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary[500]}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 30,
        }}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <ClayCard
            padding={24}
            radiusSize="xxl"
            shadow="small"
            style={{
              marginTop: 12,
              alignItems: "center",
            }}
          >
            <View className="h-20 w-20 items-center justify-center rounded-[28px] bg-ocean-100">
              <Bus size={40} color="#94A3B8" />
            </View>

            <Text
              className={`mt-4 text-base font-extrabold ${
                isDark ? "text-slate-300" : "text-ink-dark"
              }`}
            >
              No jeepneys in queue
            </Text>

            <Text
              className={`mt-1 text-center text-xs ${
                isDark ? "text-slate-500" : "text-ink-secondary"
              }`}
            >
              Both terminals currently have no waiting or loading jeepneys.
            </Text>
          </ClayCard>
        }
        ListFooterComponent={
          <View className="mt-2">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="mr-2 h-9 w-9 items-center justify-center rounded-[14px] bg-ocean-100">
                  <History size={16} color="#64748B" />
                </View>

                <Text
                  className={`text-sm font-extrabold ${
                    isDark ? "text-white" : "text-ink-dark"
                  }`}
                >
                  Recent Trips
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  router.push("/staff/(dispatcher)/reports" as any)
                }
              >
                <Text className="text-xs font-extrabold text-sky-500">
                  View reports
                </Text>
              </TouchableOpacity>
            </View>

            <ClayCard padding={0} radiusSize="xl" shadow="small">
              {recentTrips.length === 0 ? (
                <View className="items-center py-7">
                  <History size={28} color={isDark ? "#475569" : "#CBD5E1"} />

                  <Text
                    className={`mt-2 text-xs ${
                      isDark ? "text-slate-500" : "text-ink-secondary"
                    }`}
                  >
                    No recent trips
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={recentTrips}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <RecentTripRow item={item} />}
                  scrollEnabled={false}
                />
              )}
            </ClayCard>

            <ClayCard
              padding={15}
              radiusSize="xl"
              shadow="small"
              style={{
                marginTop: 12,
              }}
            >
              <View className="flex-row items-center">
                <View className="h-9 w-9 items-center justify-center rounded-[14px] bg-emerald-500/10">
                  <CheckCircle2 size={16} color="#10B981" />
                </View>

                <Text
                  className={`ml-2 text-xs font-extrabold ${
                    isDark ? "text-slate-300" : "text-ink-dark"
                  }`}
                >
                  Automatic dispatch is active
                </Text>
              </View>

              <Text
                className={`mt-2 text-[11px] leading-4 ${
                  isDark ? "text-slate-500" : "text-ink-secondary"
                }`}
              >
                Queue order and dispatch decisions are controlled by the
                automated dispatch system. Dispatcher alerts do not change queue
                order or dispatch status.
              </Text>
            </ClayCard>
          </View>
        }
      />
    </SafeAreaView>
  );
}
