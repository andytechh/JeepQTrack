import { useRouter } from "expo-router";
import {
  ArrowLeft,
  BusFront,
  RefreshCw,
  Route,
  XCircle
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  TripHistoryItem,
  useTripHistory,
} from "@/src/shared/hooks/admin/useAdminHistory";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "In Transit", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Incomplete", value: "incomplete" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

export default function TripHistoryScreen() {
  const router = useRouter();
  const { trips, loading, refreshing, isLive, error, refresh } =
    useTripHistory(100);
  const [filter, setFilter] = useState<Filter>("all");

  // tick so "in transit" durations keep counting
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? trips : trips.filter((t) => t.status === filter)),
    [trips, filter],
  );

  const inTransit = trips.filter((t) => t.status === "active").length;
  const completed = trips.filter((t) => t.status === "completed").length;

  if (loading) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="small" color={colors.primaryDark} />
            <Text className="mt-3 text-[12px] font-extrabold text-ink-dark">
              Loading trip history...
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
            paddingTop: 14,
            paddingBottom: 140,
          }}
        >
          {/* HEADER */}
          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-white/80"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft
                size={19}
                color={colors.primaryDark}
                strokeWidth={2.5}
              />
            </Pressable>

            <View className="ml-3 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-ocean-700">
                ADMIN MONITORING
              </Text>
              <Text className="mt-0.5 text-[25px] font-extrabold text-ink-dark">
                Trip History
              </Text>
            </View>

            <View
              className={`flex-row items-center rounded-full px-3 py-2 ${
                isLive ? "bg-emerald-100" : "bg-slate-100"
              }`}
            >
              <View
                className={`mr-1.5 h-[7px] w-[7px] rounded-full ${
                  isLive ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
              <Text
                className={`text-[9px] font-extrabold ${
                  isLive ? "text-emerald-700" : "text-ink-muted"
                }`}
              >
                {isLive ? "LIVE" : "OFFLINE"}
              </Text>
            </View>
          </View>

          {/* SUMMARY */}
          <View className="mt-5 flex-row">
            <SummaryCard label="In Transit" value={inTransit} />
            <SummaryCard label="Completed" value={completed} />
            <SummaryCard label="Total" value={trips.length} />
          </View>

          {/* FILTERS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-5"
          >
            {FILTERS.map((item) => {
              const selected = filter === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setFilter(item.value)}
                  className={`mr-2 rounded-full px-4 py-2.5 ${
                    selected ? "bg-ocean-400" : "bg-white/80"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-extrabold ${
                      selected ? "text-white" : "text-ink-secondary"
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ERROR */}
          {error && (
            <View className="mt-5 rounded-[24px] border border-red-100 bg-white/90 p-5">
              <Text className="text-[14px] font-extrabold text-ink-dark">
                Trip history unavailable
              </Text>
              <Text className="mt-1 text-[11px] leading-[17px] text-ink-secondary">
                {error}
              </Text>
              <Pressable
                onPress={refresh}
                className="mt-4 flex-row items-center justify-center rounded-full bg-ocean-400 py-3"
              >
                <RefreshCw size={15} color="#FFFFFF" strokeWidth={2.4} />
                <Text className="ml-2 text-[11px] font-extrabold text-white">
                  Retry
                </Text>
              </Pressable>
            </View>
          )}

          {/* LIST */}
          <View className="mt-5">
            {visible.length === 0 ? (
              <View className="items-center rounded-[23px] border border-white/90 bg-clay-surface px-6 py-7">
                <View className="h-[48px] w-[48px] items-center justify-center rounded-[15px] bg-ocean-100">
                  <XCircle
                    size={21}
                    color={colors.primaryDark}
                    strokeWidth={2.3}
                  />
                </View>
                <Text className="mt-3 text-center text-[11px] font-extrabold text-ink-secondary">
                  No trips to show yet.
                </Text>
              </View>
            ) : (
              visible.map((trip) => (
                <TripCard key={trip.id} trip={trip} now={now} />
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </OceanBackground>
  );
}

function TripCard({ trip, now }: { trip: TripHistoryItem; now: number }) {
  const active = trip.status === "active";

  const durationSeconds =
    trip.trip_duration ??
    (active && trip.departure_time
      ? Math.max(
          0,
          Math.floor((now - new Date(trip.departure_time).getTime()) / 1000),
        )
      : null);

  const pill =
    trip.status === "completed"
      ? { label: "Completed", bg: "bg-emerald-100", text: "text-emerald-700" }
      : active
        ? { label: "In Transit", bg: "bg-ocean-100", text: "text-ocean-700" }
        : { label: "Incomplete", bg: "bg-slate-100", text: "text-ink-muted" };

  return (
    <View className="mb-3 rounded-[23px] border border-white/90 bg-clay-surface p-5">
      <View className="flex-row items-center">
        <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
          <BusFront size={18} color={colors.primaryDark} strokeWidth={2.3} />
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-[12px] font-extrabold text-ink-dark">
            {trip.jeepney_name}
          </Text>
          <Text className="mt-0.5 text-[9px] text-ink-muted">
            {trip.plate_number}
          </Text>
        </View>

        <View className={`rounded-full px-3 py-1.5 ${pill.bg}`}>
          <Text className={`text-[8px] font-extrabold uppercase ${pill.text}`}>
            {pill.label}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center">
        <Route size={14} color={colors.primaryDark} strokeWidth={2.4} />
        <Text className="ml-2 text-[11px] font-extrabold text-ink-dark">
          {trip.route}
        </Text>
      </View>

      <View className="mt-4 flex-row">
        <Metric label="Departed" value={formatDateTime(trip.departure_time)} />
        <Metric
          label="Arrived"
          value={trip.arrival_time ? formatDateTime(trip.arrival_time) : "—"}
        />
      </View>

      <View className="mt-4 flex-row">
        <Metric
          label={active ? "Elapsed" : "Trip Time"}
          value={formatDuration(durationSeconds)}
        />
        <Metric
          label="Loading Time"
          value={formatDuration(trip.loading_duration_seconds)}
        />
      </View>

      <View className="mt-4 flex-row">
        <Metric
          label="Passengers"
          value={
            trip.capacity
              ? `${trip.occupancy_at_departure}/${trip.capacity}`
              : String(trip.occupancy_at_departure)
          }
        />
        <Metric label="Driver" value={trip.driver_name} />
      </View>
    </View>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <View className="mr-2 flex-1 rounded-[18px] border border-white/90 bg-clay-surface p-3">
      <Text className="text-[8px] font-extrabold uppercase tracking-[0.5px] text-ink-muted">
        {label}
      </Text>
      <Text className="mt-0.5 text-[20px] font-extrabold text-ink-dark">
        {value}
      </Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="mr-4 flex-1">
      <Text className="text-[8px] font-extrabold uppercase text-ink-muted">
        {label}
      </Text>
      <Text
        numberOfLines={1}
        className="mt-1 text-[10px] font-extrabold text-ink-dark"
      >
        {value}
      </Text>
    </View>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return "—";
  const m = Math.round(seconds / 60);
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
