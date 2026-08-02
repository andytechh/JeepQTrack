// app/staff/(driver)/index.tsx
import { router } from "expo-router";
import {
  Bus,
  MessageCircle,
  Navigation,
  Play,
  Star,
  TrendingUp,
  Users
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
import { lightTheme, theme } from "../../../../src/shared/constants/theme";
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

  // ─── RENDER STATES ──────────────────────────────────────────────
  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: lightTheme.background }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text className="mt-4" style={{ color: lightTheme.text.muted }}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  if (error || !jeepney) {
    return (
      <View
        className="flex-1 items-center justify-center p-4"
        style={{ backgroundColor: lightTheme.background }}
      >
        <Bus size={48} color={lightTheme.text.muted} />
        <Text
          className="text-lg font-bold mt-4 text-center"
          style={{ color: lightTheme.text.primary }}
        >
          No Jeepney Assigned
        </Text>
        <Text
          className="text-center text-sm mt-1"
          style={{ color: lightTheme.text.secondary }}
        >
          {error || "Please contact your dispatcher."}
        </Text>
        <TouchableOpacity
          className="mt-4 px-6 py-2.5"
          style={{
            backgroundColor: theme.colors.primary[500],
            borderRadius: theme.borderRadius.md,
          }}
          onPress={fetchDashboard}
        >
          <Text className="text-white font-medium">Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── MAIN RENDER ──────────────────────────────────────────────────
  return (
    <View className="flex-1" style={{ backgroundColor: lightTheme.background }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary[500]}
            colors={[theme.colors.primary[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
      >
        {/* ─── GREETING ────────────────────────────────────────────── */}
        <View className="flex-col gap-1 mb-5">
          <Text
            className="text-sm"
            style={{ color: lightTheme.text.secondary }}
          >
            Good afternoon,
          </Text>
          <Text
            className="text-2xl font-bold tracking-tight"
            style={{ color: lightTheme.text.primary }}
          >
            {user?.displayName || "Driver"}
          </Text>
        </View>

        {/* ─── JEEPNEY STATUS CARD (PRIMARY BACKGROUND) ──────────── */}
        <Card variant="primary" style={{ marginBottom: 20 }}>
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
                  borderRadius: theme.borderRadius.sm,
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
          <Text
            className="text-sm font-semibold"
            style={{ color: lightTheme.text.primary }}
          >
            Today at a glance
          </Text>
          <View className="flex-row flex-wrap justify-between gap-3">
            <StatCard
              label="Trips"
              value={tripStats.todayTrips}
              delta="Today"
            />
            <StatCard
              label="Passengers"
              value={tripStats.totalPassengers}
              delta="Today"
            />
            <StatCard
              label="Queue"
              value={queueInfo?.position || 0}
              delta="Waiting"
            />
            <StatCard
              label="Rating"
              value="4.8"
              delta="⭐ 4.8 (24 reviews)"
              isRating
            />
          </View>
        </View>

        {/* ─── QUICK ACTIONS ───────────────────────────────────────── */}
        <View className="flex-col gap-3 mb-5">
          <Text
            className="text-sm font-semibold"
            style={{ color: lightTheme.text.primary }}
          >
            Quick actions
          </Text>
          <View className="flex-row flex-wrap justify-between gap-3">
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
                    borderRadius: theme.borderRadius.lg,
                    height: "auto",
                    minHeight: 80,
                  }}
                >
                  <Icon
                    size={20}
                    color={action.primary ? "#fff" : theme.colors.primary[500]}
                  />
                  <Text
                    style={{
                      color: action.primary ? "#fff" : lightTheme.text.primary,
                      fontWeight: "600",
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  >
                    {action.label}
                  </Text>
                </Button>
              );
            })}
          </View>
        </View>

        {/* ─── RECENT ACTIVITY ─────────────────────────────────────── */}
        <View className="flex-col gap-3 mb-5">
          <View className="flex-row items-center justify-between">
            <Text
              className="text-sm font-semibold"
              style={{ color: lightTheme.text.primary }}
            >
              Recent activity
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/staff/(driver)/queue")}
            >
              <Text
                style={{
                  color: theme.colors.primary[500],
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                See all →
              </Text>
            </TouchableOpacity>
          </View>
          <Card style={{ padding: 0 }}>
            {trips.length === 0 ? (
              <Text
                style={{
                  padding: 16,
                  textAlign: "center",
                  color: lightTheme.text.muted,
                }}
              >
                No recent trips
              </Text>
            ) : (
              trips.slice(0, 3).map((trip, index) => (
                <View key={trip.id}>
                  {index > 0 && <Separator />}
                  <View className="flex-row items-center justify-between px-4 py-3">
                    <View className="flex-col gap-0.5">
                      <Text
                        className="text-sm font-medium"
                        style={{ color: lightTheme.text.primary }}
                      >
                        {trip.route}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="text-xs"
                          style={{ color: lightTheme.text.muted }}
                        >
                          {trip.time}
                        </Text>
                        <View
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: lightTheme.text.muted,
                          }}
                        />
                        <View className="flex-row items-center gap-1">
                          <Users size={12} color={lightTheme.text.muted} />
                          <Text
                            className="text-xs"
                            style={{ color: lightTheme.text.muted }}
                          >
                            {trip.passengers}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <StatusPill status={trip.status} />
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
            backgroundColor: lightTheme.surfaceSecondary,
          }}
        >
          <View className="flex-row items-start gap-3">
            <TrendingUp
              size={20}
              color={lightTheme.text.primary}
              style={{ marginTop: 2 }}
            />
            <View className="flex-col gap-0.5">
              <Text
                className="text-sm font-semibold"
                style={{ color: lightTheme.text.primary }}
              >
                Peak hours ahead
              </Text>
              <Text
                className="text-xs"
                style={{ color: lightTheme.text.secondary }}
              >
                Expect higher demand between 5:00 PM and 7:00 PM on{" "}
                {jeepney.route}.
              </Text>
            </View>
          </View>
        </Card>

        {/* ─── TRIP HISTORY (if you have a separate component) ──── */}
        <TripHistory trips={trips} />
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
}: {
  label: string;
  value: string | number;
  delta: string;
  isRating?: boolean;
}) {
  return (
    <Card style={{ width: "48%", padding: 12 }}>
      <View className="flex-col gap-1.5">
        <Text
          className="text-xs font-medium"
          style={{ color: lightTheme.text.muted }}
        >
          {label}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Text
            className="text-2xl font-bold tracking-tight"
            style={{ color: lightTheme.text.primary }}
          >
            {value}
          </Text>
          {isRating && (
            <Star
              size={16}
              color={theme.colors.status.busy}
              fill={theme.colors.status.busy}
            />
          )}
        </View>
        <Text className="text-[11px]" style={{ color: lightTheme.text.muted }}>
          {delta}
        </Text>
      </View>
    </Card>
  );
}
