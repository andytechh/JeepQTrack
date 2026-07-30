import { Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ModernHeader } from "../../../src/shared/components";
import { useAuthStore } from "../../../src/shared/store/authStore";

export default function AdminLayout() {
  const { user } = useAuthStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a1628" }}>
      <ModernHeader
        avatarText={user?.displayName || "Admin"}
        notificationCount={0}
      />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#0ea5e9",
          tabBarInactiveTintColor: "#64748b",
          tabBarStyle: {
            backgroundColor: "#0f172a",
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.05)",
            height: 65,
            paddingBottom: 8,
            paddingTop: 4,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
        <Tabs.Screen name="users" options={{ title: "Users" }} />
        <Tabs.Screen name="jeepneys" options={{ title: "Jeepneys" }} />
        <Tabs.Screen name="trips" options={{ title: "Trips" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      </Tabs>
    </SafeAreaView>
  );
}
