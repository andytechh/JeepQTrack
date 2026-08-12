import { Tabs } from "expo-router";
import { Bell, House, Map, Ticket, UserRound } from "lucide-react-native";
import { Platform, View } from "react-native";

import { colors } from "../../../src/shared/constants/theme";

export default function CommuterTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          marginTop: 2,
          marginBottom: 2,
        },

        tabBarItemStyle: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },

        tabBarStyle: {
          position: "absolute",

          left: 16,
          right: 16,

          bottom: Platform.OS === "ios" ? 20 : 10,

          height: 82,

          paddingTop: 5,
          paddingBottom: Platform.OS === "ios" ? 5 : 4,
          paddingHorizontal: 4,

          borderRadius: 30,

          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.95)",

          backgroundColor: "#F8FCFF",

          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.1,
          shadowRadius: 16,

          elevation: 8,

          overflow: "visible",
        },

        tabBarBackground: () => (
          <View
            style={{
              flex: 1,
              borderRadius: 30,
              backgroundColor: "#F8FCFF",
            }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",

          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 58,
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 17,

                backgroundColor: focused ? "#E0F2FE" : "transparent",

                borderWidth: focused ? 1 : 0,

                borderColor: focused ? "rgba(255,255,255,0.95)" : "transparent",

                shadowColor: focused ? "#000" : "transparent",
                shadowOffset: {
                  width: 0,
                  height: focused ? 2 : 0,
                },
                shadowOpacity: focused ? 0.06 : 0,
                shadowRadius: focused ? 4 : 0,

                elevation: focused ? 2 : 0,
              }}
            >
              <House
                size={22}
                color={focused ? colors.primaryDark : colors.textMuted}
                strokeWidth={focused ? 2.7 : 2.1}
              />
            </View>
          ),

          tabBarLabel: "Home",
        }}
      />

      <Tabs.Screen
        name="queue"
        options={{
          title: "Queue",

          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 58,
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 17,

                backgroundColor: focused ? "#E0F2FE" : "transparent",

                borderWidth: focused ? 1 : 0,

                borderColor: focused ? "rgba(255,255,255,0.95)" : "transparent",

                shadowColor: focused ? "#000" : "transparent",
                shadowOffset: {
                  width: 0,
                  height: focused ? 2 : 0,
                },
                shadowOpacity: focused ? 0.06 : 0,
                shadowRadius: focused ? 4 : 0,

                elevation: focused ? 2 : 0,
              }}
            >
              <Ticket
                size={22}
                color={focused ? colors.primaryDark : colors.textMuted}
                strokeWidth={focused ? 2.7 : 2.1}
              />
            </View>
          ),

          tabBarLabel: "Queue",
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Map",

          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 58,
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 17,

                backgroundColor: focused ? "#E0F2FE" : "transparent",

                borderWidth: focused ? 1 : 0,

                borderColor: focused ? "rgba(255,255,255,0.95)" : "transparent",

                shadowColor: focused ? "#000" : "transparent",
                shadowOffset: {
                  width: 0,
                  height: focused ? 2 : 0,
                },
                shadowOpacity: focused ? 0.06 : 0,
                shadowRadius: focused ? 4 : 0,

                elevation: focused ? 2 : 0,
              }}
            >
              <Map
                size={22}
                color={focused ? colors.primaryDark : colors.textMuted}
                strokeWidth={focused ? 2.7 : 2.1}
              />
            </View>
          ),

          tabBarLabel: "Map",
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",

          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 58,
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 17,

                backgroundColor: focused ? "#E0F2FE" : "transparent",

                borderWidth: focused ? 1 : 0,

                borderColor: focused ? "rgba(255,255,255,0.95)" : "transparent",

                shadowColor: focused ? "#000" : "transparent",
                shadowOffset: {
                  width: 0,
                  height: focused ? 2 : 0,
                },
                shadowOpacity: focused ? 0.06 : 0,
                shadowRadius: focused ? 4 : 0,

                elevation: focused ? 2 : 0,
              }}
            >
              <Bell
                size={22}
                color={focused ? colors.primaryDark : colors.textMuted}
                strokeWidth={focused ? 2.7 : 2.1}
              />
            </View>
          ),

          tabBarLabel: "Alerts",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",

          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 58,
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 17,

                backgroundColor: focused ? "#E0F2FE" : "transparent",

                borderWidth: focused ? 1 : 0,

                borderColor: focused ? "rgba(255,255,255,0.95)" : "transparent",

                shadowColor: focused ? "#000" : "transparent",
                shadowOffset: {
                  width: 0,
                  height: focused ? 2 : 0,
                },
                shadowOpacity: focused ? 0.06 : 0,
                shadowRadius: focused ? 4 : 0,

                elevation: focused ? 2 : 0,
              }}
            >
              <UserRound
                size={22}
                color={focused ? colors.primaryDark : colors.textMuted}
                strokeWidth={focused ? 2.7 : 2.1}
              />
            </View>
          ),

          tabBarLabel: "Profile",
        }}
      />
    </Tabs>
  );
}
