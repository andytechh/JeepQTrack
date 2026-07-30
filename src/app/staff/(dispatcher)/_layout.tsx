// app/staff/(dispatcher)/_layout.tsx
import { Tabs } from "expo-router";
import {
  Bell,
  BellRing,
  LayoutDashboard,
  MessageCircle,
} from "lucide-react-native";
import { SafeAreaView } from "react-native";
import { ModernHeader } from "../../../src/shared/components";
import { useAuthStore } from "../../../src/shared/store/authStore";

export default function DispatcherLayout() {
  const { user } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-[#0a1628]">
      <ModernHeader
        avatarText={user?.displayName || "Dispatcher"}
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
          tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <LayoutDashboard size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="notifications"
          options={{
            title: "Notifications",
            tabBarIcon: ({ color, size }) => (
              <BellRing size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="queue"
          options={{
            title: "Queue",
            tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="chat"
          options={{
            title: "Chat",
            tabBarIcon: ({ color, size }) => (
              <MessageCircle size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
