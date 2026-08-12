// app/staff/(admin)/(tabs)/index.tsx
import { router } from "expo-router";
import {
  Bus,
  Calendar,
  FileChartColumn,
  MessageCircle,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../../../src/shared/components/ui/Card";
import { StatusPill } from "../../../../src/shared/components/ui/StatusPill";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import {
  AdminService,
  DashboardStats,
  Trip,
} from "../../../../src/shared/services/AdminService";

const QUICK_ACTIONS = [
  {
    label: "Add User",
    description: "Create a driver, dispatcher, or admin account",
    icon: UserPlus,
    route: "/staff/(admin)/users/new",
  },
  {
    label: "Add Jeepney",
    description: "Register a new unit and assign it a bracket",
    icon: Bus,
    route: "/staff/(admin)/jeepneys/new",
  },
  {
    label: "View Reports",
    description: "Trip and passenger totals by date",
    icon: FileChartColumn,
    route: "/staff/(admin)/(screens)/reports", // ✅ correct path
  },
  {
    label: "View Trips",
    description: "List all trips",
    icon: Calendar,
    route: "/staff/(admin)/(screens)/trips", // ✅ correct path
  },
  {
    label: "Staff Chat",
    description: "Message drivers and dispatchers",
    icon: MessageCircle,
    route: "/staff/(admin)/(screens)/chat", // ✅ correct path
  },
];

function StatCard({ label, value, icon: Icon }) {
  const { isDark } = useTheme();
  return (
    <Card style={{ flex: 1, padding: 14, alignItems: "center" }}>
      <View
        className={`p-1.5 rounded-full ${isDark ? "bg-sky-900/30" : "bg-sky-50"}`}
      >
        <Icon size={20} color="#0ea5e9" />
      </View>
      <Text
        className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-slate-900"}`}
      >
        {value}
      </Text>
      <Text
        className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
      >
        {label}
      </Text>
    </Card>
  );
}

function TripRow({ trip }: { trip: Trip }) {
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
            {trip.jeepney_id}
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {new Date(trip.departure_time).toLocaleDateString()} •{" "}
            {trip.total_passengers} passengers
          </Text>
        </View>
        <StatusPill status={trip.status as any} dot isDark={isDark} />
      </View>
    </View>
  );
}

export default function AdminDashboard() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    jeepneys: 0,
    activeDrivers: 0,
    totalUsers: 0,
    tripsToday: 0,
    activeTrips: 0,
    totalPassengersToday: 0,
  });
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AdminService.getDashboardStats();
      setStats(data);
      // Fetch recent trips (last 5)
      const trips = await AdminService.getTrips({ limit: 5 });
      setRecentTrips(trips);
    } catch (err) {
      console.error("Failed to fetch admin stats", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text
          className={`mt-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}
        >
          Loading admin dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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
      >
        {/* Stats Grid */}
        <View className="flex-row gap-3">
          <StatCard icon={Bus} label="Jeepneys" value={stats.jeepneys} />
          <StatCard
            icon={Users}
            label="Active Drivers"
            value={stats.activeDrivers}
          />
          <StatCard
            icon={Calendar}
            label="Trips Today"
            value={stats.tripsToday}
          />
        </View>
        <View className="flex-row gap-3 mt-3">
          <StatCard
            icon={TrendingUp}
            label="Active Trips"
            value={stats.activeTrips}
          />
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
          <StatCard
            icon={Calendar}
            label="Passengers Today"
            value={stats.totalPassengersToday}
          />
        </View>

        {/* Quick Actions */}
        <View className="mt-6">
          <Text
            className={`text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}
          >
            Quick actions
          </Text>
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <TouchableOpacity
                key={action.label}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.7}
                className={`flex-row items-center p-4 rounded-xl mb-3 border ${
                  isDark
                    ? "bg-slate-800 border-slate-700"
                    : "bg-white border-slate-200"
                }`}
              >
                <View
                  className={`w-10 h-10 rounded-lg items-center justify-center ${isDark ? "bg-sky-500/20" : "bg-sky-50"}`}
                >
                  <Icon size={20} color="#0ea5e9" />
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
                  >
                    {action.label}
                  </Text>
                  <Text
                    className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    {action.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent Trips (Reports merged) */}
        <View className="mt-6">
          <Text
            className={`text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}
          >
            Recent Trips
          </Text>
          <Card style={{ padding: 0 }}>
            {recentTrips.length === 0 ? (
              <Text
                className={`text-center py-4 ${isDark ? "text-slate-400" : "text-slate-400"}`}
              >
                No recent trips
              </Text>
            ) : (
              recentTrips.map((trip) => <TripRow key={trip.id} trip={trip} />)
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
