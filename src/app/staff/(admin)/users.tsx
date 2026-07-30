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
import { useAuthStore } from "../../../src/shared/store/authStore";

export default function UsersScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from("users")
        .select("id, email, display_name, role, is_active")
        .order("created_at", { ascending: false })
        .limit(200);
      setUsers(data || []);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
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
        data={users}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 14,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255,255,255,0.03)",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              {item.display_name || item.email}
            </Text>
            <Text style={{ color: "#94a3b8" }}>
              {item.email} • {item.role}
            </Text>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadUsers();
            }}
            tintColor="#0ea5e9"
          />
        }
        ListEmptyComponent={
          <View style={{ padding: 32 }}>
            <Text style={{ color: "#94a3b8" }}>No users found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
