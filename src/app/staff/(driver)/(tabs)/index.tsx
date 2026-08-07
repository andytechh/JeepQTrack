// app/staff/(driver)/index.tsx
import { router } from "expo-router";
import {
  Bus,
  MessageCircle,
  Navigation,
  Play,
  Star,
  TrendingUp,
  Users,
} from "lucide-react-native";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { TripHistory } from "../(screen)/trip-history";
import { Button } from "../../../../src/shared/components/ui/Button";
import { Card } from "../../../../src/shared/components/ui/Card";
import { Progress } from "../../../../src/shared/components/ui/Progress";
import { Separator } from "../../../../src/shared/components/ui/Seperator";
import { StatusPill } from "../../../../src/shared/components/ui/StatusPill";
import { theme } from "../../../../src/shared/constants/theme";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import { useAuthStore } from "../../../../src/shared/store/authStore";
import { useDriverStore } from "../../../../src/shared/store/driverStore";

// ─── QUICK ACTIONS ──────────────────────────────────────────────────
const quickActions = [
  {
    label: "Start trip",
    route: "/staff/(driver)/gps-tracking",
    icon: Play,
    primary: true,
  },
  {
    label: "View queue",
    route: "/staff/(driver)/queue",
    icon: Users,
    primary: false,
  },
  {
    label: "GPS tracking",
    route: "/staff/(driver)/gps-tracking",
    icon: Navigation,
    primary: false,
  },
  {
    label: "Staff chat",
    route: "/staff/(driver)/chat",
    icon: MessageCircle,
    primary: false,
  },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────
export default function DriverDashboard() {
  const { user } = useAuthStore();
  const { isDark } = useTheme();
  const {
    jeepney,
    doorCounts,
    queueInfo,
    tripStats,
    statusHistory,
    trips,
    loading,
    error,
    refreshing,
    fetchDashboard,
    refresh,
    updateJeepneyStatus,
    completeTrip,
    sendEmergencyAlert,
    setupSubscriptions,
    cleanupSubscriptions,
  } = useDriverStore();

  useEffect(() => {
    fetchDashboard();
    setupSubscriptions();
    return () => {
      cleanupSubscriptions();
    };
  }, []);

  const totalPassengers = doorCounts.front_count + doorCounts.rear_count;
  const capacity = jeepney?.capacity || 24;
  const loadPercent = jeepney
    ? Math.round((totalPassengers / capacity) * 100)
    : 0;

  // ─── HELPERS ──────────────────────────────────────────────────────
  const getStatusActions = (status?: string) => {
    const statusMap: Record<
      string,
      { next: string; label: string; color: string }
    > = {
      inactive: {
        next: "waiting",
        label: "Go Online",
        color: theme.colors.status.online,
      },
      waiting: {
        next: "loading",
        label: "Start Loading",
        color: theme.colors.status.busy,
      },
      loading: {
        next: "en_route",
        label: "Depart",
        color: theme.colors.primary[500],
      },
      en_route: { next: "arrived", label: "Arrive", color: "#8b5cf6" },
      arrived: { next: "dispatched", label: "Complete Trip", color: "#ec4899" },
      dispatched: {
        next: "waiting",
        label: "Go Online",
        color: theme.colors.status.online,
      },
    };
    return statusMap[status || "inactive"] || statusMap.inactive;
  };

  const statusActions = getStatusActions(jeepney?.status);

  const handleStatusUpdate = () => {
    if (!jeepney) return;
    const { nextStatus } = statusActions;
    Alert.alert(
      "Update Status",
      `Change status from "${jeepney.status}" to "${nextStatus}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            const success = await updateJeepneyStatus(nextStatus);
            if (success) {
              Alert.alert("Success", `Status updated to ${nextStatus}`);
              await fetchDashboard();
            } else {
              Alert.alert("Error", "Failed to update status");
            }
          },
        },
      ],
    );
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "start_trip":
        if (jeepney?.status === "waiting") {
          handleStatusUpdate();
        } else {
          Alert.alert(
            "Not Ready",
            "Please wait until you're at the front of the queue.",
          );
        }
        break;
      case "end_trip":
        if (jeepney?.status === "en_route" || jeepney?.status === "arrived") {
          Alert.alert(
            "Complete Trip",
            "Are you sure you want to complete this trip?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Complete",
                onPress: async () => {
                  const success = await completeTrip();
                  if (success) {
                    Alert.alert("Success", "Trip completed successfully");
                    await fetchDashboard();
                  } else {
                    Alert.alert("Error", "Failed to complete trip");
                  }
                },
              },
            ],
          );
        } else {
          Alert.alert(
            "No Active Trip",
            "You don't have an active trip to end.",
          );
        }
        break;
      case "emergency":
        Alert.alert(
          "Emergency Alert",
          "Are you sure you want to send an emergency alert? This will notify all staff.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Send Alert",
              style: "destructive",
              onPress: async () => {
                const sent = await sendEmergencyAlert();
                if (sent) {
                  Alert.alert(
                    "Alert Sent",
                    "Emergency services have been notified",
                  );
                } else {
                  Alert.alert("Error", "Failed to send alert");
                }
              },
            },
          ],
        );
        break;
      case "chat":
        router.push("/staff/(driver)/chat");
        break;
    }
  };

  // ─── STYLES ──────────────────────────────────────────────────────
  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const surfaceBg = isDark ? "bg-slate-800" : "bg-white";
  const surfaceSecondary = isDark ? "bg-slate-700/50" : "bg-slate-100";
  const borderColor = isDark ? "border-slate-700" : "border-slate-200";

  // ─── RENDER STATES ──────────────────────────────────────────────
  if (loading) {
    return (
      <View className={`flex-1 ${bgColor} items-center justify-center`}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className={`mt-4 ${textMuted}`}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error || !jeepney) {
    return (
      <View className={`flex-1 ${bgColor} items-center justify-center p-4`}>
        <Bus size={48} color={isDark ? "#475569" : "#94a3b8"} />
        <Text className={`text-lg font-bold mt-4 text-center ${textPrimary}`}>
          No Jeepney Assigned
        </Text>
        <Text className={`text-center text-sm mt-1 ${textMuted}`}>
          {error || "Please contact your dispatcher."}
        </Text>
        <TouchableOpacity
          className="mt-4 px-6 py-2.5 bg-sky-500 rounded-xl"
          onPress={fetchDashboard}
        >
          <Text className="text-white font-medium">Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── MAIN RENDER ──────────────────────────────────────────────────
  return (
    <View className={`flex-1 ${bgColor}`}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#0ea5e9"
            colors={["#0ea5e9"]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
      >
        {/* ─── GREETING ────────────────────────────────────────────── */}
        <View className="flex-col gap-1 mb-5">
          <Text className={textSecondary}>Good afternoon,</Text>
          <Text className={`text-2xl font-bold tracking-tight ${textPrimary}`}>
            {user?.displayName || "Driver"}
          </Text>
        </View>

        {/* ─── JEEPNEY STATUS CARD ────────────────────────────────── */}
        <Card
          variant="primary"
          style={{ marginBottom: 20, backgroundColor: "#0ea5e9" }}
        >
          <View className="flex-col gap-2">
            <Text style={{ color: "#fff", opacity: 0.8, fontSize: 12 }}>
              {jeepney.route || "No route assigned"}
            </Text>
            <View className="flex-row items-center justify-between">
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
                {jeepney.plate_number}
              </Text>
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  {jeepney.status}
                </Text>
              </View>
            </View>
            <View className="flex-row items-end justify-between">
              <View>
                <Text style={{ color: "#fff", opacity: 0.8, fontSize: 10 }}>
                  Occupancy
                </Text>
                <Text
                  style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}
                >
                  {totalPassengers}
                  <Text
                    style={{ fontSize: 16, fontWeight: "400", opacity: 0.8 }}
                  >
                    {" / "}
                    {capacity}
                  </Text>
                </Text>
              </View>
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                {loadPercent}% full
              </Text>
            </View>
            <Progress
              value={loadPercent}
              color="#fff"
              trackColor="rgba(255,255,255,0.25)"
              height={6}
            />
          </View>
        </Card>

        {/* ─── TODAY AT A GLANCE ───────────────────────────────────── */}
        <View className="flex-col gap-3 mb-5">
          <Text className={`text-sm font-semibold ${textPrimary}`}>
            Today at a glance
          </Text>
          <View className="flex-row flex-wrap justify-between gap-3">
            <StatCard
              label="Trips"
              value={tripStats.todayTrips}
              delta="Today"
              isDark={isDark}
            />
            <StatCard
              label="Passengers"
              value={tripStats.totalPassengers}
              delta="Today"
              isDark={isDark}
            />
            <StatCard
              label="Queue"
              value={queueInfo?.position || 0}
              delta="Waiting"
              isDark={isDark}
            />
            <StatCard
              label="Rating"
              value="4.8"
              delta="⭐ 4.8 (24 reviews)"
              isRating
              isDark={isDark}
            />
          </View>
        </View>

        {/* ─── QUICK ACTIONS ───────────────────────────────────────── */}
        <View className="flex-col gap-3 mb-5">
          <Text className={`text-sm font-semibold ${textPrimary}`}>
            Quick actions
          </Text>
          <View className="flex-row flex-wrap justify-between gap-3 items-center">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  onPress={() => router.push(action.route as any)}
                  variant={action.primary ? "primary" : "secondary"}
                  size="lg"
                  style={{
                    width: "48%",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: 16,
                    borderRadius: 12,
                    height: "auto",
                    minHeight: 80,
                    backgroundColor: action.primary
                      ? "#0ea5e9"
                      : isDark
                        ? "#1e293b"
                        : "#f8fafc",
                    borderColor: isDark ? "#334155" : "#e2e8f0",
                    borderWidth: action.primary ? 0 : 1,
                  }}
                >
                  <View className="flex-row items-center gap-2">
                    <Icon
                      size={20}
                      color={action.primary ? "#fff" : "#0ea5e9"}
                    />
                    <Text
                      style={{
                        color: action.primary
                          ? "#fff"
                          : isDark
                            ? "#f1f5f9"
                            : "#0f172a",
                        fontWeight: "600",
                        fontSize: 14,
                        marginTop: 4,
                      }}
                    >
                      {action.label}
                    </Text>
                  </View>
                </Button>
              );
            })}
          </View>
        </View>

        {/* ─── RECENT ACTIVITY ─────────────────────────────────────── */}
        <View className="flex-col gap-3 mb-5">
          <View className="flex-row items-center justify-between">
            <Text className={`text-sm font-semibold ${textPrimary}`}>
              Recent activity
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/staff/(driver)/queue")}
            >
              <Text
                style={{ color: "#0ea5e9", fontSize: 14, fontWeight: "500" }}
              >
                See all →
              </Text>
            </TouchableOpacity>
          </View>
          <Card
            style={{
              padding: 0,
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              borderColor: isDark ? "#334155" : "#e2e8f0",
              borderWidth: 1,
            }}
          >
            {trips.length === 0 ? (
              <Text
                style={{
                  padding: 16,
                  textAlign: "center",
                  color: isDark ? "#94a3b8" : "#94a3b8",
                }}
              >
                No recent trips
              </Text>
            ) : (
              trips.slice(0, 3).map((trip, index) => (
                <View key={trip.id}>
                  {index > 0 && (
                    <Separator
                      style={{
                        backgroundColor: isDark ? "#334155" : "#e2e8f0",
                      }}
                    />
                  )}
                  <View className="flex-row items-center justify-between px-4 py-3">
                    <View className="flex-col gap-0.5">
                      <Text className={`text-sm font-medium ${textPrimary}`}>
                        {trip.route}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text className={`text-xs ${textMuted}`}>
                          {trip.time}
                        </Text>
                        <View
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: isDark ? "#475569" : "#94a3b8",
                          }}
                        />
                        <View className="flex-row items-center gap-1">
                          <Users
                            size={12}
                            color={isDark ? "#94a3b8" : "#94a3b8"}
                          />
                          <Text className={`text-xs ${textMuted}`}>
                            {trip.passengers}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <StatusPill status={trip.status} isDark={isDark} />
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>

        {/* ─── PEAK HOURS TIP ──────────────────────────────────────── */}
        <Card
          variant="accent"
          style={{
            borderWidth: 0,
            backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
          }}
        >
          <View className="flex-row items-start gap-3">
            <TrendingUp
              size={20}
              color={isDark ? "#f1f5f9" : "#0f172a"}
              style={{ marginTop: 2 }}
            />
            <View className="flex-col gap-0.5">
              <Text className={`text-sm font-semibold ${textPrimary}`}>
                Peak hours ahead
              </Text>
              <Text className={`text-xs ${textSecondary}`}>
                Expect higher demand between 5:00 PM and 7:00 PM on{" "}
                {jeepney.route}.
              </Text>
            </View>
          </View>
        </Card>

        {/* ─── TRIP HISTORY ────────────────────────────────────────── */}
        <TripHistory trips={trips} isDark={isDark} />
      </ScrollView>
    </View>
  );
}

// ─── STAT CARD COMPONENT ──────────────────────────────────────────
function StatCard({
  label,
  value,
  delta,
  isRating = false,
  isDark = false,
}: {
  label: string;
  value: string | number;
  delta: string;
  isRating?: boolean;
  isDark?: boolean;
}) {
  return (
    <Card
      style={{
        width: "48%",
        padding: 12,
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderWidth: 1,
      }}
    >
      <View className="flex-col gap-1.5">
        <Text
          className="text-xs font-medium"
          style={{ color: isDark ? "#94a3b8" : "#94a3b8" }}
        >
          {label}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Text
            className="text-2xl font-bold tracking-tight"
            style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
          >
            {value}
          </Text>
          {isRating && <Star size={16} color="#eab308" fill="#eab308" />}
        </View>
        <Text
          className="text-[11px]"
          style={{ color: isDark ? "#94a3b8" : "#94a3b8" }}
        >
          {delta}
        </Text>
      </View>
    </Card>
  );
}
