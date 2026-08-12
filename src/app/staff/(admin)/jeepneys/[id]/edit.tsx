import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { AdminService, Jeepney } from "../../../../../src/shared/services/AdminService";

const STATUSES: Jeepney["status"][] = [
  "waiting",
  "queued",
  "dispatched",
  "in_transit",
  "maintenance",
  "inactive",
];

export default function EditJeepney() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    plate_number: "",
    bracket: "1",
    capacity: "24",
    status: "waiting" as Jeepney["status"],
  });

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await AdminService.getJeepney(id);
        setForm({
          plate_number: data.plate_number,
          bracket: String(data.bracket),
          capacity: String(data.capacity),
          status: data.status,
        });
      } catch (err) {
        console.error(err);
        Toast.show({ type: "error", text1: "Failed to load jeepney" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await AdminService.updateJeepney(id, {
        plate_number: form.plate_number.trim().toUpperCase(),
        bracket: Number(form.bracket) || 1,
        capacity: Number(form.capacity) || 24,
        status: form.status,
      });
      Toast.show({ type: "success", text1: "Jeepney updated" });
      router.back();
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Failed to save changes" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a1628" }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
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
          Edit Jeepney
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: "#94a3b8", marginBottom: 6, fontSize: 13 }}>Plate number</Text>
        <TextInput
          value={form.plate_number}
          onChangeText={(t) => setForm((s) => ({ ...s, plate_number: t }))}
          style={inputStyle}
          autoCapitalize="characters"
          placeholderTextColor="#64748b"
        />

        <Text style={{ color: "#94a3b8", marginBottom: 6, marginTop: 14, fontSize: 13 }}>
          Bracket
        </Text>
        <TextInput
          value={form.bracket}
          onChangeText={(t) => setForm((s) => ({ ...s, bracket: t.replace(/[^0-9]/g, "") }))}
          style={inputStyle}
          keyboardType="number-pad"
          placeholderTextColor="#64748b"
        />

        <Text style={{ color: "#94a3b8", marginBottom: 6, marginTop: 14, fontSize: 13 }}>
          Capacity
        </Text>
        <TextInput
          value={form.capacity}
          onChangeText={(t) => setForm((s) => ({ ...s, capacity: t.replace(/[^0-9]/g, "") }))}
          style={inputStyle}
          keyboardType="number-pad"
          placeholderTextColor="#64748b"
        />

        <Text style={{ color: "#94a3b8", marginBottom: 8, marginTop: 14, fontSize: 13 }}>Status</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setForm((f) => ({ ...f, status: s }))}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: form.status === s ? "#0ea5e9" : "#071022",
              }}
            >
              <Text style={{ color: form.status === s ? "white" : "#94a3b8", fontSize: 12 }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saving ? "#475569" : "#0ea5e9",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 24,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const inputStyle = {
  backgroundColor: "#071022",
  color: "white",
  padding: 12,
  borderRadius: 12,
} as const;
