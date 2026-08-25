// app/commuter/(tabs)/_layout.tsx

import { Tabs } from "expo-router";

import { House, Map, Ticket, UserRound } from "lucide-react-native";

import ClayTabBar from "../../../../src/shared/components/clay/ClayTabBar";

export default function CommuterTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => {
        const currentRoute = props.state.routes[props.state.index];

        if (currentRoute?.name === "chat") {
          return null;
        }

        return <ClayTabBar {...(props as any)} />;
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

          tabBarIcon: ({ color, size }) => <Map size={size} color={color} />,
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
