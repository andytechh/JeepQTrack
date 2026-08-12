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
import { AdminService, UserRole } from "../../../../../src/shared/services/AdminService";

const ROLES: UserRole[] = ["driver", "dispatcher", "admin"];

export default function EditUser() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    email: "",
    role: "driver" as UserRole,
    phone_number: "",
    is_active: true,
  });

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await AdminService.getUser(id);
        setForm({
          display_name: data.display_name,
          email: data.email,
          role: data.role,
          phone_number: data.phone_number || "",
          is_active: data.is_active,
        });
      } catch (err) {
        console.error(err);
        Toast.show({ type: "error", text1: "Failed to load user" });
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
      await AdminService.updateUser(id, {
        display_name: form.display_name,
        role: form.role,
        phone_number: form.phone_number,
        is_active: form.is_active,
      });
      Toast.show({ type: "success", text1: "User updated" });
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
          Edit User
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: "#94a3b8", marginBottom: 6, fontSize: 13 }}>Display name</Text>
        <TextInput
          value={form.display_name}
          onChangeText={(t) => setForm((s) => ({ ...s, display_name: t }))}
          style={inputStyle}
          placeholder="Display name"
          placeholderTextColor="#64748b"
        />

        <Text style={{ color: "#94a3b8", marginBottom: 6, marginTop: 14, fontSize: 13 }}>Email</Text>
        <TextInput
          value={form.email}
          editable={false}
          style={[inputStyle, { opacity: 0.6 }]}
          placeholderTextColor="#64748b"
        />

        <Text style={{ color: "#94a3b8", marginBottom: 6, marginTop: 14, fontSize: 13 }}>Phone</Text>
        <TextInput
          value={form.phone_number}
          onChangeText={(t) => setForm((s) => ({ ...s, phone_number: t }))}
          style={inputStyle}
          placeholder="Phone"
          placeholderTextColor="#64748b"
          keyboardType="phone-pad"
        />

        <Text style={{ color: "#94a3b8", marginBottom: 8, marginTop: 14, fontSize: 13 }}>Role</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setForm((s) => ({ ...s, role: r }))}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: form.role === r ? "#0ea5e9" : "#071022",
              }}
            >
              <Text style={{ color: form.role === r ? "white" : "#94a3b8", fontWeight: "600" }}>
                {r[0].toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => setForm((s) => ({ ...s, is_active: !s.is_active }))}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 20,
            padding: 12,
            backgroundColor: "#071022",
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "white" }}>Account active</Text>
          <View
            style={{
              width: 44,
              height: 26,
              borderRadius: 13,
              backgroundColor: form.is_active ? "#0ea5e9" : "#334155",
              padding: 3,
              alignItems: form.is_active ? "flex-end" : "flex-start",
            }}
          >
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "white" }} />
          </View>
        </TouchableOpacity>

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
