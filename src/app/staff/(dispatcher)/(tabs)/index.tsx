import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { Clock, MapPin, Navigation, Truck, Users } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { supabase } from "../../../../src/shared/config/supabase";
import { useAuthStore } from "../../../../src/shared/store/authStore";

export default function DispatcherDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true); // ← ADD THIS
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    activeJeepneys: 0,
    waitingJeepneys: 0,
    loadingJeepneys: 0,
    enRoute: 0,
    totalPassengers: 0,
    queueSize: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // Get all jeepneys
      const { data: jeepneys, error } = await supabase
        .from("jeepneys")
        .select("*");

      if (error) {
        console.error("❌ Jeepneys fetch error:", error.message);
        return;
      }

      if (jeepneys) {
        setStats({
          activeJeepneys: jeepneys.filter((j) => j.status !== "inactive")
            .length,
          waitingJeepneys: jeepneys.filter((j) => j.status === "waiting")
            .length,
          loadingJeepneys: jeepneys.filter((j) => j.status === "loading")
            .length,
          enRoute: jeepneys.filter((j) => j.status === "en_route").length,
          totalPassengers: jeepneys.reduce(
            (s, j) => s + (j.current_occupancy || 0),
            0,
          ),
          queueSize: jeepneys.filter(
            (j) => j.status === "waiting" || j.status === "loading",
          ).length,
        });
      }

      // Recent activity
      const { data: recent } = await supabase
        .from("jeepneys")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(5);

      if (recent) setRecentActivity(recent);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false); // ← ADD THIS
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const statCards = [
    {
      label: "Active",
      value: stats.activeJeepneys,
      color: "#0ea5e9",
      icon: <Truck size={20} color="#0ea5e9" />,
    },
    {
      label: "Waiting",
      value: stats.waitingJeepneys,
      color: "#f59e0b",
      icon: <Clock size={20} color="#f59e0b" />,
    },
    {
      label: "Loading",
      value: stats.loadingJeepneys,
      color: "#22c55e",
      icon: <Navigation size={20} color="#22c55e" />,
    },
    {
      label: "En Route",
      value: stats.enRoute,
      color: "#3b82f6",
      icon: <MapPin size={20} color="#3b82f6" />,
    },
    {
      label: "Passengers",
      value: stats.totalPassengers,
      color: "#8b5cf6",
      icon: <Users size={20} color="#8b5cf6" />,
    },
    {
      label: "Queue",
      value: stats.queueSize,
      color: "#ec4899",
      icon: <Clock size={20} color="#ec4899" />,
    },
  ];

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 bg-[#0a1628] items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="text-white/60 mt-4">Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a1628]">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchData();
            }}
            tintColor="#0ea5e9"
          />
        }
      >
        <LinearGradient
          colors={["#0a1628", "#0c4a6e"]}
          className="pt-3 px-5 pb-6"
        >
          <Text className="text-white/50 text-xs">Dispatcher Dashboard</Text>
          <Text className="text-white text-xl font-bold">
            {user?.displayName || "Dispatcher"}
          </Text>
        </LinearGradient>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap px-4 -mt-4 gap-2">
          {statCards.map((s) => (
            <View
              key={s.label}
              className="w-[31%] bg-[#0f1d2e] rounded-xl p-3 items-center border border-white/5"
            >
              {s.icon}
              <Text
                className="text-lg font-bold mt-1"
                style={{ color: s.color }}
              >
                {s.value}
              </Text>
              <Text className="text-[10px] text-white/40 uppercase mt-0.5">
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Recent Activity */}
        <Text className="text-white font-bold px-4 mt-5 mb-3">
          Recent Activity
        </Text>
        {recentActivity.length === 0 ? (
          <View className="mx-4 items-center py-8 bg-white/5 rounded-xl">
            <Clock size={32} color="#475569" />
            <Text className="text-white/40 mt-2">No recent activity</Text>
          </View>
        ) : (
          recentActivity.map((item) => (
            <View
              key={item.id}
              className="mx-4 mb-2 bg-white/5 rounded-xl p-4 border border-white/5"
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-white font-semibold">
                    {item.plate_number || "Unknown"}
                  </Text>
                  <Text className="text-white/40 text-xs">
                    {item.driver_name || "No driver"}
                  </Text>
                </View>
                <View
                  className="px-3 py-1 rounded-lg"
                  style={{
                    backgroundColor:
                      item.status === "waiting"
                        ? "#f59e0b20"
                        : item.status === "loading"
                          ? "#22c55e20"
                          : "#3b82f620",
                  }}
                >
                  <Text
                    className="text-xs font-bold capitalize"
                    style={{
                      color:
                        item.status === "waiting"
                          ? "#f59e0b"
                          : item.status === "loading"
                            ? "#22c55e"
                            : "#3b82f6",
                    }}
                  >
                    {item.status?.replace("_", " ")}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-4 mt-2">
                <Text className="text-white/30 text-xs">
                  Occupancy: {item.current_occupancy || 0}/{item.capacity || 24}
                </Text>
                <Text className="text-white/30 text-xs">
                  Terminal: {item.terminal_id === 1 ? "Donsol" : "Daraga"}
                </Text>
              </View>
            </View>
          ))
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
