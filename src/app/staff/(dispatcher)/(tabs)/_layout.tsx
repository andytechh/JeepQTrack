// app/staff/(dispatcher)/(tabs)/_layout.tsx

import { Tabs } from "expo-router";
import {
  LayoutDashboard,
  ListStart,
  MapPin,
  MessageCircle,
  Settings,
} from "lucide-react-native";

import { ClayTabBar } from "../../../../src/shared/components/clay/ClayTabBar";
import { useChatStore } from "../../../../src/shared/store/chatStore";

export default function DispatcherTabsLayout() {
  const { unreadCount } = useChatStore();

  return (
    <Tabs
      tabBar={(props) => (
        <ClayTabBar {...(props as any)} chatUnreadCount={unreadCount} />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <MapPin size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="queue"
        options={{
          title: "Queue",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <ListStart size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} />
          ),
          tabBarBadge:
            unreadCount > 0
              ? unreadCount > 99
                ? "99+"
                : String(unreadCount)
              : undefined,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
