// app/staff/(driver)/index.tsx
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  AlertTriangle,
  Bus,
  Camera as CameraIcon,
  MessageCircle,
  Navigation,
  Zap
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../../src/shared/config/supabase";
import { NotificationService } from "../../../src/shared/services/NotificationService";
import { useAuthStore } from "../../../src/shared/store/authStore";

const { width } = Dimensions.get("window");

// ─── TYPES ──────────────────────────────────────────────────────────
interface Jeepney {
  id: string;
  plate_number: string;
  bracket: number;
  capacity: number;
  status:
    "waiting" | "loading" | "en_route" | "arrived" | "dispatched" | "inactive";
  current_occupancy: number;
  queue_position: number;
  current_latitude?: number;
  current_longitude?: number;
  departure_time?: string;
  eta?: number;
}

interface DoorCounts {
  front_count: number;
  rear_count: number;
  updated_at: string;
}

interface QueueInfo {
  position: number;
  status: string;
  entered_at: string;
}

interface TripStats {
  todayTrips: number;
  totalPassengers: number;
  totalFare: number;
}

// ─── ACTION BUTTON ──────────────────────────────────────────────────
const ActionButton = ({ icon, label, color, bg, onPress, disabled }: any) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 6,
        backgroundColor: disabled
          ? "rgba(255,255,255,0.03)"
          : bg || `${color}15`,
        borderWidth: 1.5,
        borderColor: disabled ? "rgba(255,255,255,0.05)" : `${color}25`,
        borderRadius: 16,
        alignItems: "center",
        gap: 8,
        opacity: disabled ? 0.5 : 1,
      }}
      activeOpacity={0.7}
    >
      <View style={{ color }}>{icon}</View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: disabled ? "rgba(255,255,255,0.3)" : color,
          textAlign: "center",
          letterSpacing: -0.11,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ─── STATUS DOT ─────────────────────────────────────────────────────
const StatusDot = ({ active }: { active: boolean }) => {
  return (
    <View
      style={{
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: active ? "#22c55e" : "#64748b",
      }}
    />
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────
export default function DriverDashboard() {
  const { user } = useAuthStore();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jeepney, setJeepney] = useState<Jeepney | null>(null);
  const [doorCounts, setDoorCounts] = useState<DoorCounts>({
    front_count: 0,
    rear_count: 0,
    updated_at: "",
  });
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [tripStats, setTripStats] = useState<TripStats>({
    todayTrips: 0,
    totalPassengers: 0,
    totalFare: 0,
  });
  const [statusHistory, setStatusHistory] = useState<
    { status: string; timestamp: string }[]
  >([]);
  const [onlineStatus, setOnlineStatus] = useState(true);

  // ─── DATA FETCHING ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user?.jeepneyId) {
      setLoading(false);
      setError("No jeepney assigned");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch jeepney details
      const { data: jeepneyData, error: jeepneyError } = await supabase
        .from("jeepneys")
        .select("*")
        .eq("id", user.jeepneyId)
        .single();

      if (jeepneyError) throw jeepneyError;
      setJeepney(jeepneyData);

      // 2. Fetch door counts
      const { data: doorData, error: doorError } = await supabase
        .from("door_counts")
        .select("*")
        .eq("jeep_id", user.jeepneyId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!doorError && doorData?.length) {
        setDoorCounts(doorData[0]);
      }

      // 3. Fetch queue position
      const { data: queueData, error: queueError } = await supabase
        .from("queue")
        .select("*")
        .eq("jeepney_id", user.jeepneyId)
        .eq("status", "waiting")
        .order("queue_position", { ascending: true })
        .limit(1);

      if (!queueError && queueData?.length) {
        setQueueInfo(queueData[0]);
      }

      // 4. Fetch today's trip stats
      const today = new Date().toISOString().split("T")[0];
      const { data: tripsData, error: tripsError } = await supabase
        .from("trips")
        .select("*")
        .eq("jeepney_id", user.jeepneyId)
        .gte("departure_time", today);

      if (!tripsError && tripsData) {
        const totalPassengers = tripsData.reduce(
          (sum, t) => sum + (t.total_passengers || 0),
          0,
        );
        setTripStats({
          todayTrips: tripsData.length,
          totalPassengers: totalPassengers,
          totalFare: tripsData.reduce(
            (sum, t) => sum + (t.total_passengers || 0) * 15,
            0,
          ), // Assuming ₱15 fare
        });
      }

      // 5. Fetch status history
      const { data: historyData } = await supabase
        .from("jeepneys")
        .select("status, updated_at")
        .eq("id", user.jeepneyId)
        .order("updated_at", { ascending: false })
        .limit(5);

      if (historyData) {
        setStatusHistory(historyData);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [user?.jeepneyId]);

  // ─── REAL-TIME SUBSCRIPTIONS ──────────────────────────────────────
  useEffect(() => {
    if (!user?.jeepneyId || !user?.uid) return;

    // Initial fetch
    fetchData();

    // Subscribe to jeepney updates
    const jeepneyChannel = supabase
      .channel(`jeepney_${user.jeepneyId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jeepneys",
          filter: `id=eq.${user.jeepneyId}`,
        },
        (payload) => {
          console.log("📱 Jeepney updated:", payload.new);
          setJeepney(payload.new as Jeepney);

          // Show notification for status changes
          if (payload.new.status !== payload.old.status) {
            NotificationService.sendNotificationToUser(
              user.uid,
              "Status Updated",
              `Jeepney ${payload.new.plate_number} is now ${payload.new.status}`,
              "status",
              { jeepneyId: user.jeepneyId, status: payload.new.status },
            );
          }
        },
      )
      .subscribe();

    // Subscribe to door count updates
    const doorChannel = supabase
      .channel(`door_counts_${user.jeepneyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "door_counts",
          filter: `jeep_id=eq.${user.jeepneyId}`,
        },
        (payload) => {
          console.log("🚪 Door count updated:", payload.new);
          setDoorCounts(payload.new);
        },
      )
      .subscribe();

    // Subscribe to queue updates
    const queueChannel = supabase
      .channel(`queue_${user.jeepneyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue",
          filter: `jeepney_id=eq.${user.jeepneyId}`,
        },
        async () => {
          // Refresh queue info
          const { data } = await supabase
            .from("queue")
            .select("*")
            .eq("jeepney_id", user.jeepneyId)
            .eq("status", "waiting")
            .order("queue_position", { ascending: true })
            .limit(1);

          if (data?.length) {
            setQueueInfo(data[0]);
          } else {
            setQueueInfo(null);
          }
        },
      )
      .subscribe();

    // Subscribe to trip updates
    const tripChannel = supabase
      .channel(`trips_${user.jeepneyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trips",
          filter: `jeepney_id=eq.${user.jeepneyId}`,
        },
        () => {
          // Refresh trip stats
          fetchData();
        },
      )
      .subscribe();

    return () => {
      jeepneyChannel.unsubscribe();
      doorChannel.unsubscribe();
      queueChannel.unsubscribe();
      tripChannel.unsubscribe();
    };
  }, [user?.jeepneyId, user?.uid]);

  // ─── ACTIONS ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getStatusActions = () => {
    if (!jeepney)
      return { currentStatus: "", nextStatus: "", label: "", actions: [] };

    const statusMap: Record<
      string,
      { next: string; label: string; color: string }
    > = {
      inactive: { next: "waiting", label: "Go Online", color: "#22c55e" },
      waiting: { next: "loading", label: "Start Loading", color: "#f59e0b" },
      loading: { next: "en_route", label: "Depart", color: "#0ea5e9" },
      en_route: { next: "arrived", label: "Arrive", color: "#8b5cf6" },
      arrived: { next: "dispatched", label: "Complete Trip", color: "#ec4899" },
      dispatched: { next: "waiting", label: "Go Online", color: "#22c55e" },
    };

    const action = statusMap[jeepney.status] || statusMap.inactive;
    return {
      currentStatus: jeepney.status,
      nextStatus: action.next,
      label: action.label,
      color: action.color,
    };
  };

  const handleStatusUpdate = () => {
    if (!jeepney) return;

    const statusActions = getStatusActions();
    const nextStatus = statusActions.nextStatus;

    Alert.alert(
      "Update Status",
      `Change status from "${jeepney.status}" to "${nextStatus}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("jeepneys")
                .update({
                  status: nextStatus,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", jeepney.id);

              if (error) throw error;

              // If status is 'en_route', create a trip record
              if (nextStatus === "en_route") {
                await supabase.from("trips").insert({
                  jeepney_id: jeepney.id,
                  driver_id: user?.uid,
                  departure_time: new Date().toISOString(),
                  occupancy_at_departure: jeepney.current_occupancy || 0,
                  route: "Donsol-Daraga",
                });
              }

              Alert.alert("Success", `Status updated to ${nextStatus}`);
              await fetchData();
            } catch (error) {
              console.error("Status update error:", error);
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
                  try {
                    // Update jeepney status
                    await supabase
                      .from("jeepneys")
                      .update({
                        status: "dispatched",
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", jeepney?.id);

                    // Update trip with arrival time
                    await supabase
                      .from("trips")
                      .update({
                        arrival_time: new Date().toISOString(),
                        total_passengers:
                          doorCounts.front_count + doorCounts.rear_count,
                      })
                      .eq("jeepney_id", jeepney?.id)
                      .is("arrival_time", null)
                      .order("departure_time", { ascending: false })
                      .limit(1);

                    Alert.alert("Success", "Trip completed successfully");
                    await fetchData();
                  } catch (error) {
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
                try {
                  // Get all staff members
                  const { data: staff } = await supabase
                    .from("users")
                    .select("id")
                    .in("role", ["admin", "dispatcher"]);

                  if (staff) {
                    for (const s of staff) {
                      await NotificationService.sendNotificationToUser(
                        s.id,
                        "🚨 EMERGENCY ALERT",
                        `Driver ${user?.displayName} (${jeepney?.plate_number}) needs assistance at ${jeepney?.current_latitude}, ${jeepney?.current_longitude}`,
                        "system",
                        {
                          type: "emergency",
                          driverId: user?.uid,
                          jeepneyId: jeepney?.id,
                          location: {
                            lat: jeepney?.current_latitude,
                            lng: jeepney?.current_longitude,
                          },
                        },
                      );
                    }
                  }
                  Alert.alert(
                    "Alert Sent",
                    "Emergency services have been notified",
                  );
                } catch (error) {
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

  // ─── RENDER ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a1628]">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="mt-4 text-white/60">Loading dashboard...</Text>
      </View>
    );
  }

  if (error || !jeepney) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a1628] p-4">
        <Bus size={48} color="#94a3b8" />
        <Text className="text-lg font-bold text-white mt-4 text-center">
          No Jeepney Assigned
        </Text>
        <Text className="text-white/60 text-center text-sm mt-1">
          {error || "Please contact your dispatcher."}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-sky-500 px-6 py-2.5 rounded-xl"
          onPress={handleRefresh}
        >
          <Text className="text-white font-medium">Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const occupancy = jeepney.current_occupancy || 0;
  const capacity = jeepney.capacity || 24;
  const totalPassengers = doorCounts.front_count + doorCounts.rear_count;
  const statusActions = getStatusActions();

  return (
    <View className="flex-1 bg-[#0a1628]">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {/* ─── HEADER ───────────────────────────────────────────────── */}
        <LinearGradient
          colors={["#0a1628", "#0c4a6e"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 12,
            paddingHorizontal: 20,
            paddingBottom: 30,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative elements */}
          <View
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: 80,
              borderWidth: 1,
              borderColor: "rgba(14,165,233,0.1)",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(14,165,233,0.06)",
            }}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              position: "relative",
              zIndex: 1,
            }}
          >
            <View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 12,
                  marginBottom: 3,
                }}
              >
                Driver Dashboard
              </Text>
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  fontWeight: "800",
                  letterSpacing: -0.36,
                }}
              >
                {user?.displayName || "Driver"}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor:
                  jeepney.status !== "inactive"
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(100,116,139,0.15)",
                borderRadius: 20,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor:
                  jeepney.status !== "inactive"
                    ? "rgba(34,197,94,0.2)"
                    : "rgba(100,116,139,0.2)",
              }}
              onPress={handleStatusUpdate}
            >
              <StatusDot active={jeepney.status !== "inactive"} />
              <Text
                style={{
                  color: jeepney.status !== "inactive" ? "#4ade80" : "#94a3b8",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {jeepney.status === "inactive" ? "Off Duty" : jeepney.status}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Jeep info */}
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: "rgba(14,165,233,0.15)",
              borderRadius: 18,
              padding: 16,
              position: "relative",
              zIndex: 1,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <View>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  ASSIGNED VEHICLE
                </Text>
                <Text
                  style={{
                    color: "white",
                    fontSize: 22,
                    fontWeight: "900",
                    letterSpacing: -0.66,
                  }}
                >
                  {jeepney.plate_number}
                </Text>
              </View>
              <View style={{ textAlign: "right" }}>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  QUEUE POSITION
                </Text>
                <Text
                  style={{
                    color: queueInfo ? "#38bdf8" : "#64748b",
                    fontSize: 22,
                    fontWeight: "900",
                    letterSpacing: -0.66,
                  }}
                >
                  #{queueInfo?.queue_position || "—"}
                </Text>
                {queueInfo && (
                  <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>
                    Entered:{" "}
                    {new Date(queueInfo.entered_at).toLocaleTimeString()}
                  </Text>
                )}
              </View>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: "rgba(255,255,255,0.08)",
                marginBottom: 14,
              }}
            />

            {/* Seat tracker */}
            <View style={{ marginBottom: 14 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  Passenger Occupancy
                </Text>
                <Text
                  style={{
                    color: "white",
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {totalPassengers} / {capacity} seats
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {Array.from({ length: Math.min(capacity, 24) }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor:
                        i < totalPassengers
                          ? "#0ea5e9"
                          : "rgba(255,255,255,0.1)",
                    }}
                  />
                ))}
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 4,
                }}
              >
                <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>
                  Front: {doorCounts.front_count}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>
                  Rear: {doorCounts.rear_count}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <View
                style={{
                  flex: 1,
                  textAlign: "center",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  padding: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: "white",
                    textAlign: "center",
                  }}
                >
                  {tripStats.todayTrips}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.45)",
                    fontWeight: "500",
                    textAlign: "center",
                  }}
                >
                  TODAY'S TRIPS
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  textAlign: "center",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  padding: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: "#38bdf8",
                    textAlign: "center",
                  }}
                >
                  {tripStats.totalPassengers}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.45)",
                    fontWeight: "500",
                    textAlign: "center",
                  }}
                >
                  PASSENGERS TODAY
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  textAlign: "center",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  padding: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: "#22c55e",
                    textAlign: "center",
                  }}
                >
                  ₱{tripStats.totalFare}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.45)",
                    fontWeight: "500",
                    textAlign: "center",
                  }}
                >
                  EARNINGS TODAY
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ─── BODY ────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          {/* Status Action Button */}
          <TouchableOpacity
            onPress={handleStatusUpdate}
            style={{
              backgroundColor: `${statusActions.color}15`,
              borderWidth: 1.5,
              borderColor: `${statusActions.color}30`,
              borderRadius: 16,
              padding: 14,
              marginVertical: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: statusActions.color,
                fontSize: 14,
                fontWeight: "700",
              }}
            >
              {statusActions.label}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: 10,
                marginTop: 2,
              }}
            >
              Current: {jeepney.status}
            </Text>
          </TouchableOpacity>

          {/* Quick Actions */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "rgba(255,255,255,0.4)",
                letterSpacing: 0.96,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Quick Actions
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <ActionButton
                icon={<Navigation size={22} color="#22c55e" />}
                label="Start Trip"
                color="#22c55e"
                onPress={() => handleQuickAction("start_trip")}
                disabled={
                  jeepney.status !== "waiting" && jeepney.status !== "loading"
                }
              />
              <ActionButton
                icon={<Zap size={22} color="#f59e0b" />}
                label="End Trip"
                color="#f59e0b"
                onPress={() => handleQuickAction("end_trip")}
                disabled={
                  jeepney.status !== "en_route" && jeepney.status !== "arrived"
                }
              />
              <ActionButton
                icon={<AlertTriangle size={22} color="#ef4444" />}
                label="Emergency"
                color="#ef4444"
                onPress={() => handleQuickAction("emergency")}
              />
              <ActionButton
                icon={<MessageCircle size={22} color="#38bdf8" />}
                label="Chat"
                color="#38bdf8"
                onPress={() => handleQuickAction("chat")}
              />
            </View>
          </View>

          {/* Status History */}
          {statusHistory.length > 0 && (
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.07)",
                borderRadius: 20,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 14,
                  fontWeight: "700",
                  marginBottom: 12,
                }}
              >
                Status History
              </Text>
              {statusHistory.slice(0, 3).map((item, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 6,
                    borderBottomWidth: index < 2 ? 1 : 0,
                    borderBottomColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 12,
                      textTransform: "capitalize",
                    }}
                  >
                    {item.status}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.3)",
                      fontSize: 11,
                    }}
                  >
                    {new Date(item.updated_at).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Camera preview */}
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              borderWidth: 1,
              borderColor: "rgba(14,165,233,0.15)",
              borderRadius: 20,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CameraIcon size={16} color="#0ea5e9" />
                <Text
                  style={{ color: "white", fontSize: 14, fontWeight: "700" }}
                >
                  Passenger Counter
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(14,165,233,0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(14,165,233,0.2)",
                  borderRadius: 20,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{ color: "#0ea5e9", fontSize: 10, fontWeight: "600" }}
                >
                  YOLO Active
                </Text>
              </View>
            </View>

            {/* Camera feed mockup */}
            <TouchableOpacity
              onPress={() => router.push("/staff/(driver)/camera")}
              style={{
                height: 120,
                borderRadius: 14,
                backgroundColor: "#0d1b2a",
                borderWidth: 1,
                borderColor: "rgba(14,165,233,0.1)",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
                marginBottom: 14,
              }}
            >
              {/* Scan lines */}
              {[20, 40, 60, 80, 100].map((y) => (
                <View
                  key={y}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: `${y}%`,
                    height: 1,
                    backgroundColor: "rgba(14,165,233,0.08)",
                  }}
                />
              ))}
              {/* Detection boxes */}
              <View
                style={{
                  position: "absolute",
                  left: 30,
                  top: 25,
                  width: 36,
                  height: 52,
                  borderWidth: 1.5,
                  borderColor: "#22d3ee",
                  borderRadius: 4,
                  shadowColor: "#22d3ee",
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left: 80,
                  top: 20,
                  width: 36,
                  height: 52,
                  borderWidth: 1.5,
                  borderColor: "#22d3ee",
                  borderRadius: 4,
                  shadowColor: "#22d3ee",
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left: 130,
                  top: 30,
                  width: 36,
                  height: 52,
                  borderWidth: 1.5,
                  borderColor: "rgba(34,211,238,0.5)",
                  borderRadius: 4,
                }}
              />
              {/* Count overlay */}
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  backgroundColor: "rgba(14,165,233,0.9)",
                  borderRadius: 8,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                }}
              >
                <Text
                  style={{ color: "white", fontSize: 11, fontWeight: "700" }}
                >
                  {totalPassengers} detected
                </Text>
              </View>
              {/* REC indicator */}
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: "#ef4444",
                  }}
                />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 10,
                    fontWeight: "600",
                  }}
                >
                  LIVE
                </Text>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                {
                  label: "Boarded",
                  value: tripStats.totalPassengers,
                  color: "#22c55e",
                },
                {
                  label: "Front Door",
                  value: doorCounts.front_count,
                  color: "#f59e0b",
                },
                {
                  label: "Rear Door",
                  value: doorCounts.rear_count,
                  color: "#8b5cf6",
                },
                {
                  label: "Occupancy",
                  value: `${totalPassengers}/${capacity}`,
                  color: "#0ea5e9",
                },
              ].map((s) => (
                <View
                  key={s.label}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderRadius: 10,
                    padding: 10,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: `${s.color}20`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "900",
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </Text>
                  <Text
                    style={{
                      fontSize: 8,
                      color: "rgba(255,255,255,0.4)",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      marginTop: 2,
                      textAlign: "center",
                    }}
                  >
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
