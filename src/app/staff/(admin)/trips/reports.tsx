import { supabase } from "@/src/shared/config/supabase";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TripsReport() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      // Simple example: group trips by date
      const { data } = await supabase.rpc("trips_by_date");
      setReports(data || []);
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-[#0a1628]">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );

  return (
    <SafeAreaView className="flex-1 bg-[#0a1628]">
      <FlatList
        data={reports}
        keyExtractor={(r, i) => String(i)}
        renderItem={({ item }) => (
          <View className="p-3 border-b border-[rgba(255,255,255,0.03)]">
            <Text className="text-white font-bold">{item.date}</Text>
            <Text className="text-[#94a3b8]">
              {item.total_trips} trips • {item.total_passengers} passengers
            </Text>
          </View>
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
          <View className="p-6">
            <Text className="text-[#94a3b8]">No report data</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
