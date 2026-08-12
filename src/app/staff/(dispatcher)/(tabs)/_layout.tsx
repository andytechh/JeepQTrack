// app/staff/(dispatcher)/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import {
  LayoutDashboard,
  ListStart,
  MapPin,
  MessageCircle,
  Settings,
} from "lucide-react-native";
import { CustomTabBar } from "../../../../src/shared/components/ui/CustomTabBar";
import { useChatStore } from "../../../../src/shared/store/chatStore";

export default function DispatcherTabsLayout() {
  const { unreadCount } = useChatStore();
  const badge =
    unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined;

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...(props as any)} />}
      screenOptions={{ headerShown: false }}
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
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => <MapPin size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: "Queue",
          tabBarIcon: ({ color, size }) => (
            <ListStart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} />
          ),
          tabBarBadge: badge,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
