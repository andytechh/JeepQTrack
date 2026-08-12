import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { AdminService, Jeepney } from "../../../../../src/shared/services/AdminService";

const statusColor: Record<string, string> = {
  waiting: "#f59e0b",
  queued: "#0ea5e9",
  dispatched: "#8b5cf6",
  in_transit: "#22c55e",
  maintenance: "#ef4444",
  inactive: "#64748b",
};

export default function JeepneyDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [jeep, setJeep] = useState<Jeepney | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await AdminService.getJeepney(id);
      setJeep(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = () => {
    if (!jeep) return;
    Alert.alert("Delete Jeepney", `Remove ${jeep.plate_number}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await AdminService.deleteJeepney(jeep.id);
            Toast.show({ type: "success", text1: "Jeepney deleted" });
            router.back();
          } catch (err) {
            Toast.show({ type: "error", text1: "Failed to delete jeepney" });
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a1628" }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  if (!jeep) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a1628" }}>
        <Text style={{ color: "#94a3b8" }}>Jeepney not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a1628" }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={22} color="white" />
        </TouchableOpacity>
        <Text style={{ color: "white", fontSize: 18, fontWeight: "700", marginLeft: 12, flex: 1 }}>
          Jeepney Details
        </Text>
        <TouchableOpacity onPress={handleDelete} style={{ padding: 4 }}>
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "bold" }}>{jeep.plate_number}</Text>
        <Text style={{ color: "#94a3b8", marginTop: 6 }}>Bracket: {jeep.bracket}</Text>
        <Text style={{ color: "#94a3b8", marginTop: 2 }}>
          Occupancy: {jeep.current_occupancy ?? 0}/{jeep.capacity}
        </Text>

        <View
          style={{
            alignSelf: "flex-start",
            marginTop: 10,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: (statusColor[jeep.status] || "#64748b") + "20",
          }}
        >
          <Text style={{ color: statusColor[jeep.status] || "#94a3b8", fontSize: 12, fontWeight: "600" }}>
            {jeep.status}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push(`/staff/(admin)/jeepneys/${jeep.id}/edit`)}
          style={{
            marginTop: 24,
            backgroundColor: "#0ea5e9",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Pencil size={16} color="white" />
          <Text style={{ color: "white", fontWeight: "700" }}>Edit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
