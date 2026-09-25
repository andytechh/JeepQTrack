import { Tabs } from "expo-router";

import ClayTabBar from "@/src/shared/components/clay/ClayTabBar";
import { useStaffNotifications } from "@/src/shared/hooks/useStaffNotifications";
import { useChatStore } from "@/src/shared/store/chatStore";

export default function AdminTabsLayout() {
  const chatUnreadCount = useChatStore((state) => state.unreadCount);

  const { unreadCount: notificationsUnreadCount } = useStaffNotifications();

  return (
    <Tabs
      tabBar={(props) => {
        const currentRoute = props.state.routes[props.state.index];

        /*
         * Hide tab bar while inside chat.
         */
        if (currentRoute?.name === "chat") {
          return null;
        }

        return (
          <ClayTabBar
            {...(props as any)}
            chatUnreadCount={chatUnreadCount}
            notificationsUnreadCount={notificationsUnreadCount}
          />
        );
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
