import { Tabs } from "expo-router";

import ClayTabBar from "@/src/shared/components/clay/ClayTabBar";
import { useChatStore } from "@/src/shared/store/chatStore";

export default function AdminTabsLayout() {
  const unreadCount = useChatStore((state) => state.unreadCount);

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
          title: "Dashboard",
        }}
      />

      <Tabs.Screen
        name="queue"
        options={{
          title: "Queue",
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
        }}
      />
    </Tabs>
  );
}
