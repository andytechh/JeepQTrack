import { Tabs } from "expo-router";

import { useNotifications } from "@/src/shared/hooks/useCommuterNotifications";
import { useCurrentUserId } from "@/src/shared/hooks/useCurrentUserId";
import ClayTabBar from "../../../src/shared/components/clay/ClayTabBar";
const userId = useCurrentUserId();
const { unreadCount } = useNotifications(userId);

export default function CommuterTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <ClayTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
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
        name="notifications"
        options={{
          tabBarBadge:
            unreadCount > 0
              ? unreadCount > 9
                ? "9+"
                : unreadCount
              : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}
