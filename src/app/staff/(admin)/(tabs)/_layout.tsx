import { Tabs } from "expo-router";

import ClayTabBar from "@/src/shared/components/clay/ClayTabBar";

export default function AdminTabsLayout() {
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
        name="alerts"
        options={{
          title: "Alerts",
        }}
      />
    </Tabs>
  );
}
