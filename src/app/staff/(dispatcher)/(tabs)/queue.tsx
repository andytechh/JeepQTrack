// app/staff/(dispatcher)/queue.tsx
import { router } from "expo-router";
import {
  ArrowLeft,
  Bus,
  Clock,
  History,
  Navigation,
  Search,
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

import { Card } from "../../../../src/shared/components/ui/Card";
import { StatusPill } from "../../../../src/shared/components/ui/StatusPill";
import { supabase } from "../../../../src/shared/config/supabase";
import { theme } from "../../../../src/shared/constants/theme";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import { DispatchService } from "../../../../src/shared/services/DispatchService";
import { useAuthStore } from "../../../../src/shared/store/authStore";

// ─── TYPES ──────────────────────────────────────────────────────────
interface QueueJeepney {
  id: string;
  plate_number: string;
  driver_name: string | null;
  driver_id: string | null;
  jeep_name: string | null;
  status: "waiting" | "loading";
  terminal_id: 1 | 2;
  bracket: number;
  queue_position: number | null;
  current_occupancy: number;
  capacity: number;
  loading_started_at: string | null;
  loading_ends_at: string | null;
  entered_geofence_at: string | null;
}

interface RecentTrip {
  id: string;
  jeepney_id: string;
  plate_number: string;
  driver_name: string | null;
  route: string;
  passengers: number;
  started_at: string;
}

const LOADING_DURATION_MS = 30 * 60 * 1000; // fallback if loading_ends_at is missing

const terminalName = (id: number) => (id === 1 ? "Donsol" : "Daraga");
const routeForTerminal = (id: number) =>
  id === 1 ? "Donsol → Daraga" : "Daraga → Donsol";

function formatCountdown(ms: number) {
  if (ms <= 0) return "Ready";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── TICK HOOK (drives the live countdown) ──────────────────────────
function useNowTick(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ─── LOADING TIMER PILL ──────────────────────────────────────────────
function LoadingTimer({ item, now }: { item: QueueJeepney; now: number }) {
  const { isDark } = useTheme();

  if (item.status !== "loading" || !item.loading_started_at) return null;

  const endTime = item.loading_ends_at
    ? new Date(item.loading_ends_at).getTime()
    : new Date(item.loading_started_at).getTime() + LOADING_DURATION_MS;

  const remaining = endTime - now;
  const isUrgent = remaining > 0 && remaining < 5 * 60 * 1000; // last 5 min
  const isOverdue = remaining <= 0;

  return (
    <View
      className={`flex-row items-center gap-1 px-2 py-1 rounded-full ${
        isOverdue
          ? isDark
            ? "bg-red-500/20"
            : "bg-red-50"
          : isUrgent
            ? isDark
              ? "bg-amber-500/20"
              : "bg-amber-50"
            : isDark
              ? "bg-blue-500/20"
              : "bg-blue-50"
      }`}
    >
      <Clock
        size={12}
        color={isOverdue ? "#ef4444" : isUrgent ? "#f59e0b" : "#3b82f6"}
      />
      <Text
        className={`text-xs font-semibold ${
          isOverdue
            ? "text-red-500"
            : isUrgent
              ? "text-amber-500"
              : "text-blue-500"
        }`}
      >
        {isOverdue ? "Overdue to depart" : formatCountdown(remaining)}
      </Text>
    </View>
  );
}

// ─── QUEUE ITEM ───────────────────────────────────────────────────────
function QueueItemCard({
  item,
  now,
  onDispatch,
  dispatching,
}: {
  item: QueueJeepney;
  now: number;
  onDispatch: (item: QueueJeepney) => void;
  dispatching: boolean;
}) {
  const { isDark } = useTheme();
  const isLoading = item.status === "loading";

  return (
    <Card className="mb-3 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View
            className={`w-9 h-9 rounded-full items-center justify-center ${
              isLoading
                ? isDark
                  ? "bg-blue-500/20"
                  : "bg-blue-50"
                : isDark
                  ? "bg-amber-500/20"
                  : "bg-amber-50"
            }`}
          >
            <Text
              className={`text-sm font-bold ${
                isLoading ? "text-blue-600" : "text-amber-600"
              }`}
            >
              {item.queue_position ?? "-"}
            </Text>
          </View>

          <View className="flex-1">
            <Text
              className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
            >
              {item.plate_number}
              {item.jeep_name ? `  ·  ${item.jeep_name}` : ""}
            </Text>
            <Text
              className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              {item.driver_name || "No driver assigned"} · Bracket{" "}
              {item.bracket}
            </Text>
            <Text
              className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}
            >
              {item.current_occupancy}/{item.capacity} passengers
            </Text>
          </View>
        </View>

        <View className="items-end gap-1.5">
          <StatusPill status={item.status} dot isDark={isDark} />
          <LoadingTimer item={item} now={now} />
        </View>
      </View>

      {isLoading && (
        <TouchableOpacity
          className="mt-3 bg-sky-500 rounded-xl py-2.5 items-center flex-row justify-center gap-2"
          onPress={() => onDispatch(item)}
          disabled={dispatching}
        >
          {dispatching ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Navigation size={16} color="white" />
              <Text className="text-white text-sm font-semibold">
                Dispatch Now
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </Card>
  );
}

// ─── RECENT TRIP ROW ─────────────────────────────────────────────────
function RecentTripRow({ item }: { item: RecentTrip }) {
  const { isDark } = useTheme();
  return (
    <View
      className={`px-4 py-3 border-b ${isDark ? "border-slate-700" : "border-slate-100"}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text
            className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {item.plate_number}
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {item.driver_name || "Unknown"} · {item.route}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}
          >
            {new Date(item.started_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          <Text
            className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}
          >
            {item.passengers} pax
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────
export default function DispatcherQueueScreen() {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const now = useNowTick();

  const [jeepneys, setJeepneys] = useState<QueueJeepney[]>([]);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  // ─── FETCH QUEUE ────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    const { data, error } = await supabase
      .from("jeepneys")
      .select(
        "id, plate_number, driver_name, driver_id, jeep_name, status, terminal_id, bracket, queue_position, current_occupancy, capacity, loading_started_at, loading_ends_at, entered_geofence_at",
      )
      .in("status", ["waiting", "loading"])
      .order("terminal_id", { ascending: true })
      .order("bracket", { ascending: true })
      .order("queue_position", { ascending: true });

    if (error) {
      console.error("Failed to load queue:", error.message);
      return;
    }
    setJeepneys((data as QueueJeepney[]) || []);
  }, []);

  // ─── FETCH RECENT TRIPS ─────────────────────────────────────────
  const fetchRecentTrips = useCallback(async () => {
    const { data, error } = await supabase
      .from("trips")
      .select(
        "id, jeepney_id, route, passengers, started_at, jeepneys:jeepney_id (plate_number, driver_name)",
      )
      .order("started_at", { ascending: false })
      .limit(8);

    if (error) {
      console.error("Failed to load recent trips:", error.message);
      return;
    }

    setRecentTrips(
      (data || []).map((t: any) => ({
        id: t.id,
        jeepney_id: t.jeepney_id,
        plate_number: t.jeepneys?.plate_number || "Unknown",
        driver_name: t.jeepneys?.driver_name || null,
        route: t.route || "—",
        passengers: t.passengers || 0,
        started_at: t.started_at,
      })),
    );
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([fetchQueue(), fetchRecentTrips()]);
  }, [fetchQueue, fetchRecentTrips]);

  useEffect(() => {
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  // ─── REALTIME ───────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("dispatcher-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jeepneys" },
        () => fetchQueue(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trips" },
        () => fetchRecentTrips(),
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [fetchQueue, fetchRecentTrips]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  // ─── DISPATCH ───────────────────────────────────────────────────
  const handleDispatch = useCallback(
    (item: QueueJeepney) => {
      Alert.alert(
        "Dispatch Jeepney",
        `Dispatch ${item.plate_number} (${item.driver_name || "no driver"}) on ${routeForTerminal(item.terminal_id)}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Dispatch",
            onPress: async () => {
              setDispatchingId(item.id);
              const result = await DispatchService.dispatchJeepney(
                item.id,
                (user as any)?.id,
              );
              setDispatchingId(null);

              if (result.success) {
                await loadAll();
              } else {
                Alert.alert(
                  "Dispatch Failed",
                  result.error || "Please try again.",
                );
              }
            },
          },
        ],
      );
    },
    [loadAll],
  );

  // ─── FILTER + GROUP BY TERMINAL ─────────────────────────────────
  const sections = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = jeepneys.filter(
      (j) =>
        j.plate_number.toLowerCase().includes(q) ||
        (j.driver_name || "").toLowerCase().includes(q),
    );

    const byTerminal: Record<number, QueueJeepney[]> = {};
    filtered.forEach((j) => {
      byTerminal[j.terminal_id] = byTerminal[j.terminal_id] || [];
      byTerminal[j.terminal_id].push(j);
    });

    return Object.entries(byTerminal)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([terminalId, data]) => ({
        title: terminalName(Number(terminalId)),
        data,
      }));
  }, [jeepneys, searchQuery]);

  const waitingCount = jeepneys.filter((j) => j.status === "waiting").length;
  const loadingCount = jeepneys.filter((j) => j.status === "loading").length;

  if (loading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
      >
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
    >
      {/* Header */}
      <View
        className={`flex-row items-center px-4 py-3 border-b ${
          isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={24} color={isDark ? "#94a3b8" : "#0f172a"} />
        </TouchableOpacity>
        <Text
          className={`text-xl font-bold flex-1 ${isDark ? "text-white" : "text-slate-900"}`}
        >
          Queue Management
        </Text>
      </View>

      {/* Search */}
      <View
        className={`flex-row items-center mx-4 mt-4 mb-3 px-3 py-2.5 rounded-xl border ${
          isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}
      >
        <Search size={18} color="#94a3b8" />
        <TextInput
          className={`flex-1 text-base ml-2 ${isDark ? "text-white" : "text-slate-900"}`}
          placeholder="Search by plate or driver..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View className="flex-row justify-around mx-4 mb-3">
        <View className="items-center">
          <Text
            className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {waitingCount}
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Waiting
          </Text>
        </View>
        <View className="items-center">
          <Text
            className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {loadingCount}
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Loading
          </Text>
        </View>
        <View className="items-center">
          <Text
            className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {recentTrips.length}
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Recent trips
          </Text>
        </View>
      </View>

      {/* Queue list, grouped by terminal */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <QueueItemCard
            item={item}
            now={now}
            onDispatch={handleDispatch}
            dispatching={dispatchingId === item.id}
          />
        )}
        renderSectionHeader={({ section }) => (
          <Text
            className={`text-xs font-bold tracking-wide mb-2 mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {section.title.toUpperCase()} TERMINAL
          </Text>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[500]}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        ListEmptyComponent={
          <View className="items-center py-10">
            <Bus size={48} color={isDark ? "#475569" : "#cbd5e1"} />
            <Text
              className={`mt-3 text-base ${isDark ? "text-slate-500" : "text-slate-400"}`}
            >
              No jeepneys in queue
            </Text>
          </View>
        }
        ListFooterComponent={
          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <History size={16} color={isDark ? "#94a3b8" : "#64748b"} />
                <Text
                  className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
                >
                  Recent trips
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  router.push("/staff/(dispatcher)/reports" as any)
                }
              >
                <Text className="text-xs text-sky-500 font-medium">
                  View all reports
                </Text>
              </TouchableOpacity>
            </View>
            <Card style={{ padding: 0 }}>
              {recentTrips.length === 0 ? (
                <Text
                  className={`text-center py-4 ${isDark ? "text-slate-400" : "text-slate-400"}`}
                >
                  No recent trips
                </Text>
              ) : (
                <FlatList
                  data={recentTrips}
                  keyExtractor={(t) => t.id}
                  renderItem={({ item }) => <RecentTripRow item={item} />}
                  scrollEnabled={false}
                />
              )}
            </Card>
          </View>
        }
      />
    </SafeAreaView>
  );
}
