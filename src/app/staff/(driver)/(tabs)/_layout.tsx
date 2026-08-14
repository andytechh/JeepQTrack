// app/commuter/(tabs)/_layout.tsx

import { Tabs } from "expo-router";

import { Bell, House, Map, Ticket, UserRound } from "lucide-react-native";

import ClayTabBar from "../../../../src/shared/components/clay/ClayTabBar";

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
        name="notifications"
        options={{
          title: "Alerts",

          tabBarBadge: 2,

          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
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
