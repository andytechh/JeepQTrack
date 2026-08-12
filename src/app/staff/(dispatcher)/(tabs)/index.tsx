// app/staff/(dispatcher)/(tabs)/index.tsx
import { router } from "expo-router";
import {
  AlertTriangle,
  Bus,
  Clock,
  ListStart,
  MapPin,
  MessageCircle,
  TrendingUp,
  Users,
  X
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
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
import { useAuthStore } from "../../../../src/shared/store/authStore";

// ─── TYPES ──────────────────────────────────────────────────────────
interface JeepneyWithOccupancy {
  id: string;
  plate_number: string;
  bracket: number;
  capacity: number;
  status: string;
  current_occupancy: number;
  queue_position: number | null;
  terminal_id: number;
  driver_name: string | null;
  driver_id: string | null;
  front_count?: number;
  rear_count?: number;
}

interface TripLog {
  id: string;
  jeepney_id: string;
  jeepney_plate: string;
  driver_name: string;
  route: string;
  status: "completed" | "in_progress" | "cancelled";
  passengers: number;
  started_at: string;
  ended_at: string | null;
}

// ─── STATUS COLOR MAP ──────────────────────────────────────────────
const statusColorMap: Record<string, string> = {
  active: "border-green-500",
  online: "border-green-500",
  completed: "border-green-500",
  arrived: "border-green-500",
  waiting: "border-yellow-500",
  loading: "border-yellow-500",
  pending: "border-yellow-500",
  en_route: "border-blue-500",
  offline: "border-red-500",
  inactive: "border-red-500",
  cancelled: "border-red-500",
  dispatched: "border-red-500",
};

// ─── STAT CARD ──────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  color = "sky",
}: {
  label: string;
  value: string | number;
  icon: any;
  color?: "sky" | "green" | "purple" | "orange" | "emerald";
}) {
  const { isDark } = useTheme();
  const colors = {
    sky: { bg: isDark ? "bg-sky-900/30" : "bg-sky-50", text: "text-sky-500" },
    green: {
      bg: isDark ? "bg-green-900/30" : "bg-green-50",
      text: "text-green-500",
    },
    purple: {
      bg: isDark ? "bg-purple-900/30" : "bg-purple-50",
      text: "text-purple-500",
    },
    orange: {
      bg: isDark ? "bg-orange-900/30" : "bg-orange-50",
      text: "text-orange-500",
    },
    emerald: {
      bg: isDark ? "bg-emerald-900/30" : "bg-emerald-50",
      text: "text-emerald-500",
    },
  };
  const colorSet = colors[color];

  return (
    <Card style={{ width: "48%", padding: 12 }}>
      <View className="flex-row items-center justify-between">
        <Text
          className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
        >
          {label}
        </Text>
        <View className={`p-1.5 rounded-full ${colorSet.bg}`}>
          <Icon size={16} color={theme.colors.primary[500]} />
        </View>
      </View>
      <Text
        className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-slate-900"}`}
      >
        {value}
      </Text>
    </Card>
  );
}

// ─── NEXT TO NOTIFY ─────────────────────────────────────────────────
function NextToNotifyCard({
  jeepney,
  onNotify,
  notifying,
}: {
  jeepney: JeepneyWithOccupancy | null;
  onNotify: () => void;
  notifying: boolean;
}) {
  const { isDark } = useTheme();

  if (!jeepney) {
    return (
      <Card style={{ marginBottom: theme.spacing.lg }}>
        <Text
          className={`text-center py-4 ${isDark ? "text-slate-400" : "text-slate-400"}`}
        >
          No jeepneys currently in queue.
        </Text>
      </Card>
    );
  }

  const terminalName = jeepney.terminal_id === 1 ? "Donsol" : "Daraga";
  const occupancy = (jeepney.front_count || 0) + (jeepney.rear_count || 0);

  return (
    <Card
      style={{
        marginBottom: theme.spacing.lg,
        borderWidth: 2,
        borderColor: theme.colors.primary[500],
      }}
    >
      <Text
        className={`text-xs font-bold tracking-wide mb-2 ${isDark ? "text-sky-400" : "text-sky-600"}`}
      >
        NEXT TO DISPATCH
      </Text>
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text
            className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {jeepney.plate_number}
          </Text>
          <Text
            className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {jeepney.driver_name || "No driver assigned"}
          </Text>
        </View>
        <StatusPill status={jeepney.status as any} dot isDark={isDark} />
      </View>

      <View className="flex-row gap-4 mb-4">
        <View>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Terminal
          </Text>
          <Text
            className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {terminalName}
          </Text>
        </View>
        <View>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Queue
          </Text>
          <Text
            className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            #{jeepney.queue_position ?? "N/A"}
          </Text>
        </View>
        <View>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Occupancy
          </Text>
          <Text
            className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {occupancy}/{jeepney.capacity}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        className="bg-amber-500 py-3.5 rounded-xl items-center flex-row justify-center gap-2"
        onPress={onNotify}
        disabled={notifying}
      >
        {notifying ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <AlertTriangle size={18} color="white" />
            <Text className="text-white font-semibold">Notify Driver</Text>
          </>
        )}
      </TouchableOpacity>
    </Card>
  );
}

// ─── JEEPNEY LIST ITEM ─────────────────────────────────────────────
function JeepneyListItem({
  item,
  onPress,
  onAlert,
}: {
  item: JeepneyWithOccupancy;
  onPress: () => void;
  onAlert: (jeepney: JeepneyWithOccupancy) => void;
}) {
  const { isDark } = useTheme();
  const occupancy = (item.front_count || 0) + (item.rear_count || 0);
  const loadPercent = Math.round((occupancy / item.capacity) * 100);
  const borderColor = statusColorMap[item.status] || "border-slate-400";
  const terminalName = item.terminal_id === 1 ? "📍 Donsol" : "📍 Daraga";

  return (
    <Card className="mb-2 p-0 overflow-hidden">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        className="flex-row"
      >
        <View
          className={`w-1.5 ${borderColor}`}
          style={{ backgroundColor: borderColor.replace("border-", "") }}
        />

        <View className="flex-1 flex-row items-center justify-between p-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text
                className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}
              >
                {item.plate_number}
              </Text>
              <StatusPill
                status={item.status as any}
                dot
                isDark={isDark}
                size="small"
              />
            </View>
            <Text
              className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              {item.driver_name || "No driver"}
            </Text>
            <View className="flex-row items-center gap-2 mt-0.5 flex-wrap">
              <Text
                className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}
              >
                {terminalName}
              </Text>
              <View className="w-1 h-1 rounded-full bg-slate-400" />
              <Text
                className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}
              >
                {occupancy}/{item.capacity} passengers
              </Text>
              <View className="w-1 h-1 rounded-full bg-slate-400" />
              <Text
                className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}
              >
                {loadPercent}% full
              </Text>
              {item.queue_position !== null && (
                <>
                  <View className="w-1 h-1 rounded-full bg-slate-400" />
                  <Text
                    className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    #{item.queue_position} in queue
                  </Text>
                </>
              )}
            </View>
          </View>

          <TouchableOpacity
            className="w-8 h-8 rounded-full items-center justify-center bg-amber-500/10"
            onPress={() => onAlert(item)}
          >
            <AlertTriangle size={16} color="#f59e0b" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Card>
  );
}

// ─── TRIP LOG ITEM ──────────────────────────────────────────────────
function TripLogItem({ item }: { item: TripLog }) {
  const { isDark } = useTheme();
  const statusColors = {
    completed: {
      bg: isDark ? "bg-green-900/30" : "bg-green-50",
      text: "text-green-600",
    },
    in_progress: {
      bg: isDark ? "bg-blue-900/30" : "bg-blue-50",
      text: "text-blue-600",
    },
    cancelled: {
      bg: isDark ? "bg-red-900/30" : "bg-red-50",
      text: "text-red-600",
    },
  };
  const colorSet = statusColors[item.status] || statusColors.completed;

  return (
    <View
      className={`px-4 py-2.5 border-b ${isDark ? "border-slate-700" : "border-slate-100"}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text
              className={`font-medium text-sm ${isDark ? "text-white" : "text-slate-900"}`}
            >
              {item.jeepney_plate}
            </Text>
            <View className={`px-2 py-0.5 rounded-full ${colorSet.bg}`}>
              <Text
                className={`text-[10px] font-medium capitalize ${colorSet.text}`}
              >
                {item.status.replace("_", " ")}
              </Text>
            </View>
          </View>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {item.driver_name} · {item.route}
          </Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <Text
              className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}
            >
              {new Date(item.started_at).toLocaleTimeString()}
            </Text>
            <View className="w-1 h-1 rounded-full bg-slate-400" />
            <Text
              className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}
            >
              {item.passengers} passengers
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── ALERT MODAL ────────────────────────────────────────────────────
function AlertModal({
  visible,
  jeepneys,
  onClose,
  onSendAlert,
}: {
  visible: boolean;
  jeepneys: JeepneyWithOccupancy[];
  onClose: () => void;
  onSendAlert: (jeepneyId: string, message: string) => void;
}) {
  const { isDark } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState("");

  const handleSend = () => {
    if (selectedId && alertMessage.trim()) {
      onSendAlert(selectedId, alertMessage.trim());
      setSelectedId(null);
      setAlertMessage("");
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 bg-black/50 justify-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="w-full"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-t-3xl p-6 max-h-[80%]`}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text
                className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
              >
                Send Alert
              </Text>
              <TouchableOpacity onPress={onClose} className="p-1">
                <X size={24} color={isDark ? "#94a3b8" : "#64748b"} />
              </TouchableOpacity>
            </View>

            <Text
              className={`text-sm mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              Select a jeepney to alert:
            </Text>

            <FlatList
              data={jeepneys}
              keyExtractor={(item) => item.id}
              className="max-h-40"
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`flex-row items-center justify-between py-3 px-2 border-b ${isDark ? "border-slate-700" : "border-slate-100"}`}
                  onPress={() => setSelectedId(item.id)}
                >
                  <View>
                    <Text
                      className={`font-medium text-sm ${isDark ? "text-white" : "text-slate-900"}`}
                    >
                      {item.plate_number}
                    </Text>
                    <Text
                      className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {item.driver_name || "No driver"} · {item.status}
                    </Text>
                  </View>
                  {selectedId === item.id && (
                    <View className="w-5 h-5 rounded-full bg-sky-500 items-center justify-center">
                      <Text className="text-white text-xs">✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />

            <View
              className={`mt-4 p-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-50"} border ${isDark ? "border-slate-600" : "border-slate-200"}`}
            >
              <TextInput
                className={`text-base ${isDark ? "text-white" : "text-slate-900"}`}
                placeholder="Alert message..."
                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                value={alertMessage}
                onChangeText={setAlertMessage}
                multiline
                numberOfLines={3}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
            </View>

            <TouchableOpacity
              className={`mt-4 py-3.5 rounded-xl flex-row items-center justify-center ${
                selectedId && alertMessage.trim()
                  ? "bg-amber-500"
                  : "bg-slate-300"
              }`}
              onPress={handleSend}
              disabled={!selectedId || !alertMessage.trim()}
            >
              <AlertTriangle size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Send Alert</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────
export default function DispatcherDashboard() {
  const { isDark } = useTheme();
  const { user, refreshUser } = useAuthStore();
  const terminalId = user?.terminalId ?? 1;

  const [jeepneys, setJeepneys] = useState<JeepneyWithOccupancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripLogs, setTripLogs] = useState<TripLog[]>([]);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [notifying, setNotifying] = useState(false);

  // ─── FETCH JEEPNEYS WITH OCCUPANCY ──────────────────────────────
  const fetchJeepneys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: jeepneyData, error: jeepneyError } = await supabase
        .from("jeepneys")
        .select("*")
        .eq("terminal_id", terminalId)
        .order("queue_position", { ascending: true, nullsFirst: false });

      if (jeepneyError) throw jeepneyError;

      if (!jeepneyData || jeepneyData.length === 0) {
        setJeepneys([]);
        setLoading(false);
        return;
      }

      const jeepneyIds = jeepneyData.map((j: any) => j.id);
      const { data: doorData } = await supabase
        .from("door_counts")
        .select("jeep_id, front_count, rear_count, updated_at")
        .in("jeep_id", jeepneyIds)
        .order("updated_at", { ascending: false });

      const latestDoorMap = new Map<string, any>();
      if (doorData) {
        doorData.forEach((d) => {
          if (!latestDoorMap.has(d.jeep_id)) {
            latestDoorMap.set(d.jeep_id, d);
          }
        });
      }

      const merged: JeepneyWithOccupancy[] = jeepneyData.map((j: any) => {
        const door = latestDoorMap.get(j.id);
        return {
          ...j,
          front_count: door?.front_count || 0,
          rear_count: door?.rear_count || 0,
        };
      });

      setJeepneys(merged);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [terminalId]);

  // ─── FETCH TRIP LOGS ────────────────────────────────────────────
  const fetchTripLogs = useCallback(async () => {
    try {
      const { data: tripsData, error } = await supabase
        .from("trips")
        .select(
          `
          id,
          jeepney_id,
          route,
          status,
          total_passengers as passengers,
          departure_time as started_at,
          arrival_time as ended_at,
          jeepneys:jeepney_id (plate_number, driver_name)
        `,
        )
        .order("departure_time", { ascending: false })
        .limit(10);

      if (error) throw error;

      const logs: TripLog[] = (tripsData || []).map((t: any) => ({
        id: t.id,
        jeepney_id: t.jeepney_id,
        jeepney_plate: t.jeepneys?.plate_number || "Unknown",
        driver_name: t.jeepneys?.driver_name || "Unknown",
        route: t.route || "Donsol ↔ Daraga",
        status: t.status || "completed",
        passengers: t.passengers || 0,
        started_at: t.started_at,
        ended_at: t.ended_at,
      }));
      setTripLogs(logs);
    } catch (err: any) {
      console.warn("Trip logs error:", err.message);
      setTripLogs([]);
    }
  }, []);

  // ─── SEND ALERT ──────────────────────────────────────────────────
  const handleSendAlert = useCallback(
    async (jeepneyId: string, message: string) => {
      try {
        const { error } = await supabase.from("alerts").insert({
          jeepney_id: jeepneyId,
          dispatcher_id: user?.uid,
          message: message,
          sent_at: new Date().toISOString(),
          status: "sent",
        });
        if (error) throw error;
        Alert.alert("Alert Sent", "Alert sent to jeepney successfully.");
      } catch (err: any) {
        console.error("Send alert error:", err);
        Alert.alert("Error", "Failed to send alert. Please try again.");
      }
    },
    [user?.uid],
  );

  // ─── NOTIFY DRIVER ──────────────────────────────────────────────
  const handleNotifyDriver = useCallback(async () => {
    if (!nextToDispatch) return;
    Alert.alert(
      "Notify Driver",
      `Send notification to ${nextToDispatch.plate_number} (Driver: ${nextToDispatch.driver_name || "N/A"})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            setNotifying(true);
            await handleSendAlert(
              nextToDispatch.id,
              "Please prepare for departure. You are next in queue.",
            );
            setNotifying(false);
          },
        },
      ],
    );
  }, [nextToDispatch, handleSendAlert]);

  // ─── COMPUTE NEXT TO DISPATCH ──────────────────────────────────
  const nextToDispatch = useMemo(() => {
    const queued = jeepneys
      .filter((j) => j.queue_position !== null && j.status !== "inactive")
      .sort((a, b) => (a.queue_position || 999) - (b.queue_position || 999));
    return queued[0] || null;
  }, [jeepneys]);

  // ─── COMPUTE STATS ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = jeepneys.length;
    const online = jeepneys.filter((j) =>
      ["active", "en_route", "loading"].includes(j.status),
    ).length;
    const waiting = jeepneys.filter((j) => j.status === "waiting").length;
    const queueLength = jeepneys.filter(
      (j) => j.queue_position !== null,
    ).length;
    const activeTrips = jeepneys.filter((j) =>
      ["en_route", "arrived"].includes(j.status),
    ).length;
    return {
      totalJeepneys: total,
      onlineJeepneys: online,
      waitingDrivers: waiting,
      queueLength,
      activeTrips,
    };
  }, [jeepneys]);

  // ─── REFRESH (includes terminal refresh) ──────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser(); // 👈 pulls fresh preferred_terminal
    await Promise.all([fetchJeepneys(), fetchTripLogs()]);
    setRefreshing(false);
  }, [refreshUser, fetchJeepneys, fetchTripLogs]);

  // ─── SUBSCRIPTIONS ──────────────────────────────────────────────
  useEffect(() => {
    refreshUser().then(() => {
      fetchJeepneys();
      fetchTripLogs();
    });

    const channel = supabase
      .channel("dispatcher-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jeepneys" },
        () => fetchJeepneys(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "door_counts" },
        () => fetchJeepneys(),
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [refreshUser, fetchJeepneys, fetchTripLogs]);

  // ─── RENDER STATES ──────────────────────────────────────────────
  if (loading && jeepneys.length === 0) {
    return (
      <View
        className={`flex-1 items-center justify-center ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
      >
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text
          className={`mt-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}
        >
          Loading dashboard...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        className={`flex-1 items-center justify-center p-5 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
      >
        <Text className="text-red-500 text-lg text-center">{error}</Text>
        <TouchableOpacity
          className="mt-4 bg-sky-500 px-6 py-3 rounded-xl"
          onPress={fetchJeepneys}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary[500]}
          colors={[theme.colors.primary[500]]}
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
    >
      {/* ─── GREETING ────────────────────────────────────────────── */}
      <View className="flex-col gap-1 mb-5">
        <Text
          className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}
        >
          Good afternoon,
        </Text>
        <Text
          className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
        >
          {user?.displayName || "Dispatcher"}
        </Text>
        <Text
          className={`text-xs ${isDark ? "text-slate-400" : "text-slate-400"}`}
        >
          {terminalId === 1 ? "Donsol" : "Daraga"} Terminal
        </Text>
      </View>

      {/* ─── NEXT TO NOTIFY ───────────────────────────────────────── */}
      <NextToNotifyCard
        jeepney={nextToDispatch}
        onNotify={handleNotifyDriver}
        notifying={notifying}
      />

      {/* ─── STATS GRID ──────────────────────────────────────────── */}
      <View className="flex-row flex-wrap justify-between gap-3 mb-5">
        <StatCard
          label="Total"
          value={stats.totalJeepneys}
          icon={Bus}
          color="sky"
        />
        <StatCard
          label="Online"
          value={stats.onlineJeepneys}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Waiting"
          value={stats.waitingDrivers}
          icon={Clock}
          color="orange"
        />
        <StatCard
          label="Queue"
          value={stats.queueLength}
          icon={Users}
          color="purple"
        />
      </View>

      {/* ─── QUICK ACTIONS ───────────────────────────────────────── */}
      <View className="flex-col gap-3 mb-5">
        <Text
          className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
        >
          Quick actions
        </Text>
        <View className="flex-row flex-wrap justify-between gap-3">
          {[
            {
              label: "Queue",
              route: "/staff/(dispatcher)/queue",
              icon: ListStart,
              primary: true,
            },
            {
              label: "Live Map",
              route: "/staff/(dispatcher)/map",
              icon: MapPin,
              primary: false,
            },
            {
              label: "Send Alert",
              icon: AlertTriangle,
              primary: false,
              action: () => setAlertModalVisible(true),
            },
            {
              label: "Chat",
              route: "/staff/(dispatcher)/chat",
              icon: MessageCircle,
              primary: false,
            },
          ].map((action) => {
            const Icon = action.icon;
            const onPress =
              action.action || (() => router.push(action.route as any));
            return (
              <TouchableOpacity
                key={action.label}
                className={`w-[48%] p-4 rounded-xl ${
                  action.primary
                    ? "bg-sky-500"
                    : isDark
                      ? "bg-slate-800"
                      : "bg-white"
                } border ${isDark ? "border-slate-700" : "border-slate-200"}`}
                onPress={onPress}
                style={{
                  shadowColor: action.primary ? "#0ea5e9" : "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: action.primary ? 0.3 : 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Icon
                  size={20}
                  color={action.primary ? "#fff" : theme.colors.primary[500]}
                />
                <Text
                  className={`text-sm font-semibold mt-2 ${action.primary ? "text-white" : isDark ? "text-white" : "text-slate-900"}`}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ─── JEEPNEY LIST ────────────────────────────────────────── */}
      <View className="flex-col gap-3 mb-5">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            Jeepneys
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {jeepneys.length} total
          </Text>
        </View>
        {jeepneys.length === 0 ? (
          <Text
            className={`text-center py-4 ${isDark ? "text-slate-400" : "text-slate-400"}`}
          >
            No jeepneys at your terminal
          </Text>
        ) : (
          <FlatList
            data={jeepneys.slice(0, 10)}
            renderItem={({ item }) => (
              <JeepneyListItem
                item={item}
                onPress={() =>
                  router.push(`/staff/(dispatcher)/jeepney/${item.id}` as any)
                }
                onAlert={() => setAlertModalVisible(true)}
              />
            )}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* ─── TRIP LOGS ───────────────────────────────────────────── */}
      <View className="flex-col gap-3">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            Recent trips
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {tripLogs.length} logs
          </Text>
        </View>
        <Card style={{ padding: 0 }}>
          {tripLogs.length === 0 ? (
            <Text
              className={`text-center py-4 ${isDark ? "text-slate-400" : "text-slate-400"}`}
            >
              No recent trips
            </Text>
          ) : (
            tripLogs
              .slice(0, 5)
              .map((item) => <TripLogItem key={item.id} item={item} />)
          )}
        </Card>
      </View>

      {/* ─── ALERT MODAL ──────────────────────────────────────────── */}
      <AlertModal
        visible={alertModalVisible}
        jeepneys={jeepneys}
        onClose={() => setAlertModalVisible(false)}
        onSendAlert={handleSendAlert}
      />
    </ScrollView>
  );
}
