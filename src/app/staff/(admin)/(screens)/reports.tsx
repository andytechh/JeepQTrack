// app/staff/(admin)/(screens)/reports.tsx
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../../../src/shared/components/ui/Card";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import { AdminService } from "../../../../src/shared/services/AdminService";

interface ReportRow {
  date: string;
  total_trips: number;
  total_passengers: number;
}

export default function TripsReport() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AdminService.getTripsByDate();
      setReports(data);
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalTrips = reports.reduce((s, r) => s + (r.total_trips || 0), 0);
  const totalPassengers = reports.reduce(
    (s, r) => s + (r.total_passengers || 0),
    0,
  );

  if (loading && reports.length === 0)
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
      <View className="px-4 pt-4">
        <Text
          className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
        >
          Trip Reports
        </Text>
      </View>

      <View className="flex-row gap-3 px-4 pt-3">
        <Card style={{ flex: 1, padding: 14 }}>
          <Text
            className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Total trips
          </Text>
          <Text
            className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {totalTrips}
          </Text>
        </Card>
        <Card style={{ flex: 1, padding: 14 }}>
          <Text
            className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Total passengers
          </Text>
          <Text
            className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {totalPassengers}
          </Text>
        </Card>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(r, i) => String(i)}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Card className="mb-3 p-4">
            <Text
              className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
            >
              {item.date}
            </Text>
            <Text
              className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              {item.total_trips} trips • {item.total_passengers} passengers
            </Text>
          </Card>
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
              No report data yet.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
