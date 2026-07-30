import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../src/shared/config/supabase";

export default function JeepneysScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jeepneys, setJeepneys] = useState<any[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from("jeepneys")
        .select(
          "id, plate_number, bracket, status, current_occupancy, capacity",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      setJeepneys(data || []);
    } catch (err) {
      console.error("Failed to load jeepneys", err);
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
        data={jeepneys}
        keyExtractor={(j) => j.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 14,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255,255,255,0.03)",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              {item.plate_number}
            </Text>
            <Text style={{ color: "#94a3b8" }}>
              Bracket {item.bracket} • {item.current_occupancy}/{item.capacity}{" "}
              • {item.status}
            </Text>
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
          <View style={{ padding: 32 }}>
            <Text style={{ color: "#94a3b8" }}>No jeepneys found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
