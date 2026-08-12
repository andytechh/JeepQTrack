import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { AdminService, AdminUser } from "../../../../../src/shared/services/AdminService";

export default function UserDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await AdminService.getUser(id);
      setUser(data);
    } catch (err) {
      console.error("Failed to load user", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleActive = async () => {
    if (!user) return;
    try {
      await AdminService.toggleUserActive(user.id, !user.is_active);
      setUser({ ...user, is_active: !user.is_active });
      Toast.show({ type: "success", text1: user.is_active ? "User deactivated" : "User activated" });
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to update user" });
    }
  };

  const handleDelete = () => {
    if (!user) return;
    Alert.alert("Delete User", `Remove ${user.display_name || user.email}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await AdminService.deleteUser(user.id);
            Toast.show({ type: "success", text1: "User deleted" });
            router.back();
          } catch (err) {
            Toast.show({ type: "error", text1: "Failed to delete user" });
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

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a1628" }}>
        <Text style={{ color: "#94a3b8" }}>User not found</Text>
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
          User Details
        </Text>
        <TouchableOpacity onPress={handleDelete} style={{ padding: 4 }}>
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "bold" }}>
          {user.display_name || user.email}
        </Text>
        <Text style={{ color: "#94a3b8", marginTop: 6 }}>{user.email}</Text>
        <Text style={{ color: "#64748b", marginTop: 2 }}>
          Role: {user.role[0].toUpperCase() + user.role.slice(1)}
        </Text>
        <Text style={{ color: "#64748b", marginTop: 2 }}>
          Phone: {user.phone_number || "—"}
        </Text>

        <View
          style={{
            alignSelf: "flex-start",
            marginTop: 10,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: user.is_active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          }}
        >
          <Text style={{ color: user.is_active ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: "600" }}>
            {user.is_active ? "Active" : "Inactive"}
          </Text>
        </View>

        <View style={{ marginTop: 24, gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push(`/staff/(admin)/users/${user.id}/edit`)}
            style={{
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

          <TouchableOpacity
            onPress={handleToggleActive}
            style={{
              backgroundColor: "#071022",
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              {user.is_active ? "Deactivate User" : "Activate User"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
