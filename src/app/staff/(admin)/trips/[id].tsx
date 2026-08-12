import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AdminService, Trip } from "../../../../src/shared/services/AdminService";

export default function TripDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<Trip | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await AdminService.getTrip(id);
      setTrip(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a1628" }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a1628" }}>
        <Text style={{ color: "#94a3b8" }}>Trip not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a1628" }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={22} color="white" />
        </TouchableOpacity>
        <Text style={{ color: "white", fontSize: 18, fontWeight: "700", marginLeft: 12 }}>
          Trip Details
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Detail label="Jeepney" value={trip.jeepney_id} />
        {trip.driver_id && <Detail label="Driver" value={trip.driver_id} />}
        <Detail label="Departure" value={new Date(trip.departure_time).toLocaleString()} />
        {trip.arrival_time && (
          <Detail label="Arrival" value={new Date(trip.arrival_time).toLocaleString()} />
        )}
        <Detail label="Passengers" value={String(trip.total_passengers)} />
        {trip.status && <Detail label="Status" value={trip.status} />}
      </View>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.05)",
      }}
    >
      <Text style={{ color: "#64748b" }}>{label}</Text>
      <Text style={{ color: "white", fontWeight: "500" }}>{value}</Text>
    </View>
  );
}
