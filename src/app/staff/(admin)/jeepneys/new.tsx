import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
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
import { AdminService } from "../../../../src/shared/services/AdminService";

export default function NewJeepney() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    plate_number: "",
    bracket: "1",
    capacity: "24",
  });

  const handleCreate = async () => {
    setError(null);
    if (!form.plate_number.trim()) {
      setError("Plate number is required.");
      return;
    }
    try {
      setSaving(true);
      await AdminService.createJeepney({
        plate_number: form.plate_number.trim().toUpperCase(),
        bracket: Number(form.bracket) || 1,
        capacity: Number(form.capacity) || 24,
      });
      Toast.show({ type: "success", text1: "Jeepney added" });
      router.back();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to add jeepney.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a1628" }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={22} color="white" />
        </TouchableOpacity>
        <Text style={{ color: "white", fontSize: 18, fontWeight: "700", marginLeft: 12 }}>
          Add Jeepney
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: "#94a3b8", marginBottom: 6, fontSize: 13 }}>Plate number</Text>
        <TextInput
          value={form.plate_number}
          onChangeText={(t) => setForm((s) => ({ ...s, plate_number: t }))}
          placeholder="ABC 1234"
          placeholderTextColor="#64748b"
          autoCapitalize="characters"
          style={inputStyle}
        />

        <Text style={{ color: "#94a3b8", marginBottom: 6, marginTop: 14, fontSize: 13 }}>
          Bracket
        </Text>
        <TextInput
          value={form.bracket}
          onChangeText={(t) => setForm((s) => ({ ...s, bracket: t.replace(/[^0-9]/g, "") }))}
          placeholder="1"
          placeholderTextColor="#64748b"
          keyboardType="number-pad"
          style={inputStyle}
        />

        <Text style={{ color: "#94a3b8", marginBottom: 6, marginTop: 14, fontSize: 13 }}>
          Capacity
        </Text>
        <TextInput
          value={form.capacity}
          onChangeText={(t) => setForm((s) => ({ ...s, capacity: t.replace(/[^0-9]/g, "") }))}
          placeholder="24"
          placeholderTextColor="#64748b"
          keyboardType="number-pad"
          style={inputStyle}
        />

        {error && <Text style={{ color: "#ef4444", marginTop: 12, fontSize: 13 }}>{error}</Text>}

        <TouchableOpacity
          onPress={handleCreate}
          disabled={saving}
          style={{
            backgroundColor: saving ? "#475569" : "#0ea5e9",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 20,
          }}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "700" }}>Add Jeepney</Text>
          )}
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
