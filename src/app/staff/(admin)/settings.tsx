import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../../src/shared/store/authStore";

export default function AdminSettings() {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a1628", padding: 16 }}>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: "white", fontWeight: "700", fontSize: 18 }}>
          Account
        </Text>
        <Text style={{ color: "#94a3b8", marginTop: 6 }}>
          {user?.displayName || user?.email}
        </Text>
        <Text style={{ color: "#64748b", marginTop: 2 }}>{user?.role}</Text>
      </View>

      <TouchableOpacity
        onPress={() => logout()}
        style={{
          backgroundColor: "#0ea5e9",
          padding: 12,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
