// app/staff/(dispatcher)/index.tsx
import { router } from "expo-router";
import {
  AlertTriangle,
  Bus,
  Clock,
  ListStart,
  MessageCircle,
  TrendingUp,
  Users,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { useDispatcherStore } from "../../../../src/shared/store/dispatcherStore";

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
    <Card style={{ width: "48%", padding: 14 }}>
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

// ─── JEEPNEY LIST ITEM ─────────────────────────────────────────────
function JeepneyListItem({
  item,
  onAlert,
}: {
  item: any;
  onAlert: (jeepney: any) => void;
}) {
  const { isDark } = useTheme();
  const loadPercent = Math.round(
    (item.current_occupancy / item.capacity) * 100,
  );
  const borderColor = statusColorMap[item.status] || "border-slate-400";

  return (
    <Card className="mb-3 p-0 overflow-hidden">
      <View className="flex-row">
        <View
          className={`w-1.5 ${borderColor}`}
          style={{ backgroundColor: borderColor.replace("border-", "") }}
        />

        <View className="flex-1 flex-row items-center justify-between p-4">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text
                className={`font-semibold text-base ${isDark ? "text-white" : "text-slate-900"}`}
              >
                {item.plate_number}
              </Text>
              <StatusPill status={item.status} dot isDark={isDark} />
            </View>
            <Text
              className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              {item.driver_name || "No driver assigned"}
            </Text>
            <View className="flex-row items-center gap-3 mt-0.5">
              <Text
                className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}
              >
                {item.current_occupancy}/{item.capacity} passengers
              </Text>
              <View className="w-1 h-1 rounded-full bg-slate-400" />
              <Text
                className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}
              >
                {loadPercent}% full
              </Text>
              {item.queue_position !== null && (
                <>
                  <View className="w-1 h-1 rounded-full bg-slate-400" />
                  <Text
                    className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    #{item.queue_position} in queue
                  </Text>
                </>
              )}
            </View>
          </View>

          <TouchableOpacity
            className="w-10 h-10 rounded-full items-center justify-center bg-amber-500/10"
            onPress={() => onAlert(item)}
          >
            <AlertTriangle size={18} color="#f59e0b" />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

// ─── TRIP LOG ITEM ──────────────────────────────────────────────────
function TripLogItem({ item }: { item: any }) {
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
      className={`px-4 py-3 border-b ${isDark ? "border-slate-700" : "border-slate-100"}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text
              className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}
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
            className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {item.driver_name} · {item.route}
          </Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <Text
              className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}
            >
              {new Date(item.started_at).toLocaleTimeString()}
            </Text>
            <View className="w-1 h-1 rounded-full bg-slate-400" />
            <Text
              className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}
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
  jeepneys: any[];
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
      <View className="flex-1 bg-black/50 justify-end">
        <View
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
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`flex-row items-center justify-between py-3 px-2 border-b ${isDark ? "border-slate-700" : "border-slate-100"}`}
                onPress={() => setSelectedId(item.id)}
              >
                <View>
                  <Text
                    className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}
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
        </View>
      </View>
    </Modal>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────
export default function DispatcherDashboard() {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const {
    jeepneys,
    tripLogs,
    stats,
    loading,
    refreshing,
    error,
    fetchData,
    refresh,
    setRefreshing,
  } = useDispatcherStore();

  const [alertModalVisible, setAlertModalVisible] = useState(false);

  // ─── FETCH ON MOUNT ──────────────────────────────────────────────
  useEffect(() => {
    if (user?.uid) {
      fetchData();
    }
  }, [user?.uid, fetchData]);

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

  // ─── REFRESH ──────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // ─── RENDER STATES ──────────────────────────────────────────────
  if (loading && jeepneys.length === 0) {
    return (
      <View
        className={`flex-1 items-center justify-center ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text
          className={`mt-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}
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
          onPress={fetchData}
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
          tintColor="#0ea5e9"
          colors={["#0ea5e9"]}
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
          Daraga Terminal
        </Text>
      </View>

      {/* ─── STATS GRID ──────────────────────────────────────────── */}
      <View className="flex-row flex-wrap justify-between gap-3 mb-5">
        <StatCard
          label="Total Jeepneys"
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
              >
                <Icon size={20} color={action.primary ? "#fff" : "#0ea5e9"} />
                <Text
                  className={`text-sm font-semibold mt-2 ${
                    action.primary
                      ? "text-white"
                      : isDark
                        ? "text-white"
                        : "text-slate-900"
                  }`}
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
            No jeepneys available
          </Text>
        ) : (
          <FlatList
            data={jeepneys.slice(0, 10)}
            renderItem={({ item }) => (
              <JeepneyListItem
                item={item}
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
