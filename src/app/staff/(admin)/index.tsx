import { Bus, Calendar, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ModernHeader, StatsCard } from "../../../src/shared/components";
import { supabase } from "../../../src/shared/config/supabase";
import { useAuthStore } from "../../../src/shared/store/authStore";

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>({
    jeepneys: 0,
    activeDrivers: 0,
    tripsToday: 0,
  });

  const fetchStats = async () => {
    try {
      setLoading(true);

      const [{ data: jeepneys }, { data: drivers }, { data: trips }] =
        await Promise.all([
          supabase
            .from("jeepneys")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("role", "driver"),
          supabase
            .from("trips")
            .select("id", { count: "exact", head: true })
            .gte("departure_time", new Date().toISOString().split("T")[0]),
        ] as any);

      setStats({
        jeepneys: jeepneys?.count || 0,
        activeDrivers: drivers?.count || 0,
        tripsToday: trips?.count || 0,
      });
    } catch (err) {
      console.error("Failed to fetch admin stats", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#0a1628",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ color: "#94a3b8", marginTop: 12 }}>
          Loading admin dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a1628" }}>
      <ModernHeader
        avatarText={user?.displayName || "Admin"}
        notificationCount={0}
      />

      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <StatsCard
              icon={Bus as any}
              label="Jeepneys"
              value={stats.jeepneys}
            />
          </View>
          <View style={{ flex: 1 }}>
            <StatsCard
              icon={Users as any}
              label="Active Drivers"
              value={stats.activeDrivers}
            />
          </View>
          <View style={{ flex: 1 }}>
            <StatsCard
              icon={Calendar as any}
              label="Trips Today"
              value={stats.tripsToday}
            />
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ color: "#94a3b8", marginBottom: 8 }}>
            Quick actions
          </Text>
          <FlatList
            data={["Manage Users", "Manage Jeepneys", "Generate Reports"]}
            keyExtractor={(i) => i}
            renderItem={({ item }) => (
              <View
                style={{
                  padding: 12,
                  backgroundColor: "#071022",
                  borderRadius: 10,
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: "white" }}>{item}</Text>
              </View>
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchStats();
                }}
                tintColor="#0ea5e9"
              />
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
