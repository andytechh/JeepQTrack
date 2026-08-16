// app/staff/(admin)/(screens)/trips.tsx
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusPill } from "../../../../src/shared/components/ui/StatusPill";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import {
  AdminService,
  Trip,
} from "../../../../src/shared/services/AdminService";

export default function TripsScreen() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AdminService.getTrips();
      setTrips(data);
    } catch (err) {
      console.error("Failed to load trips", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && trips.length === 0)
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
    >
      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/staff/(admin)/trips/${item.id}`)}
            className={`p-4 rounded-xl mb-3 ${isDark ? "bg-slate-800" : "bg-white"} border ${isDark ? "border-slate-700" : "border-slate-200"}`}
          >
            <Text
              className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
            >
              Jeep: {item.jeepney_id}
            </Text>
            <Text
              className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              {new Date(item.departure_time).toLocaleString()} •{" "}
              {item.total_passengers} passengers
            </Text>
            {item.status && (
              <View className="mt-2 self-start">
                <StatusPill status={item.status as any} dot isDark={isDark} />
              </View>
            )}
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#0ea5e9"
          />
        }
        ListEmptyComponent={
          <View className="py-8">
            <Text
              className={`text-center ${isDark ? "text-slate-400" : "text-slate-400"}`}
            >
              No trips found.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
