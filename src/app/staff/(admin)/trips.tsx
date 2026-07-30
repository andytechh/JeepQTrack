import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../src/shared/config/supabase";

export default function TripsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from("trips")
        .select("id, jeepney_id, departure_time, total_passengers")
        .order("departure_time", { ascending: false })
        .limit(200);
      setTrips(data || []);
    } catch (err) {
      console.error("Failed to load trips", err);
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
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a1628" }}>
      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 14,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255,255,255,0.03)",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              Jeep: {item.jeepney_id}
            </Text>
            <Text style={{ color: "#94a3b8" }}>
              {new Date(item.departure_time).toLocaleString()} •{" "}
              {item.total_passengers} passengers
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
          <View style={{ padding: 32 }}>
            <Text style={{ color: "#94a3b8" }}>No trips found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
