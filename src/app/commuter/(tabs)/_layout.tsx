import { Tabs } from "expo-router";

import ClayTabBar from "../../../src/shared/components/clay/ClayTabBar";

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
          title: "Alerts",
          tabBarBadge: 2,
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
