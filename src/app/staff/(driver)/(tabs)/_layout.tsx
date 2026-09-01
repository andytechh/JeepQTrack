import { Tabs } from "expo-router";

import {
  House,
  Map,
  MessageCircle,
  Ticket,
  UserRound,
} from "lucide-react-native";

import ClayTabBar from "../../../../src/shared/components/clay/ClayTabBar";
import { useChatStore } from "../../../../src/shared/store/chatStore";

export default function CommuterTabsLayout() {
  const { unreadCount } = useChatStore();

  return (
    <Tabs
      tabBar={(props) => {
        const currentRoute = props.state.routes[props.state.index];

        if (currentRoute?.name === "chat") {
          return null;
        }

        return <ClayTabBar {...(props as any)} chatUnreadCount={unreadCount} />;
      }}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",

          tabBarIcon: ({ color, size }) => <House size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="queue"
        options={{
          title: "Queue",

          tabBarIcon: ({ color, size }) => <Ticket size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Map",

          tabBarIcon: ({ color, size }) => <Map size={size} color={color} />,
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
        name="profile"
        options={{
          title: "Profile",

          tabBarIcon: ({ color, size }) => (
            <UserRound size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
