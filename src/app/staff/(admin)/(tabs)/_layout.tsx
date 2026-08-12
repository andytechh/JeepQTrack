// app/staff/(admin)/(tabs)/_layout.tsx
import { router, Tabs } from "expo-router";
import {
  Bus,
  LayoutDashboard,
  MapPin,
  Settings,
  Users,
} from "lucide-react-native";
import { CustomTabBar } from "../../../../src/shared/components/ui/CustomTabBar";
import { ModernHeader } from "../../../../src/shared/components/ui/ModernHeader";
import { useAuthStore } from "../../../../src/shared/store/authStore";

export default function AdminTabsLayout() {
  const { user } = useAuthStore();

  return (
    <>
      <ModernHeader
        avatarText={user?.displayName || "Admin"}
        notificationCount={0}
        onAvatarPress={() => router.push("/staff/(admin)/(tabs)/settings")}
      />
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <LayoutDashboard color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: "Users",
            tabBarIcon: ({ color, size }) => (
              <Users color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="jeepneys"
          options={{
            title: "Jeepneys",
            tabBarIcon: ({ color, size }) => <Bus color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="live-map"
          options={{
            title: "Live Map",
            tabBarIcon: ({ color, size }) => (
              <MapPin color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <Settings color={color} size={size} />
            ),
          }}
        />
        {/* Chat is now a quick action on the Dashboard – add it here if you prefer a tab */}
        {/* <Tabs.Screen name="chat" options={{ title: "Chat", tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }} /> */}
      </Tabs>
    </>
  );
}
