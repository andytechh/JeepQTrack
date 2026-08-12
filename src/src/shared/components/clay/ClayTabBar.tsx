import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Bell, House, Map, User, Users } from "lucide-react-native";

import { colors, spacing } from "../../constants/theme";

type TabName = "index" | "queue" | "map" | "notifications" | "profile";

interface ClayTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const tabs: {
  name: TabName;
  label: string;
  icon: React.ComponentType<any>;
}[] = [
  {
    name: "index",
    label: "Home",
    icon: House,
  },
  {
    name: "queue",
    label: "Queue",
    icon: Users,
  },
  {
    name: "map",
    label: "Map",
    icon: Map,
  },
  {
    name: "notifications",
    label: "Alerts",
    icon: Bell,
  },
  {
    name: "profile",
    label: "Profile",
    icon: User,
  },
];

function ClayTab({
  active,
  label,
  Icon,
  onPress,
  badge,
}: {
  active: boolean;
  label: string;
  Icon: React.ComponentType<any>;
  onPress: () => void;
  badge?: number;
}) {
  const scale = useRef(new Animated.Value(active ? 1 : 0.94)).current;
  const activeScale = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: active ? 1 : 0.94,
        useNativeDriver: true,
        speed: 24,
        bounciness: 7,
      }),
      Animated.spring(activeScale, {
        toValue: active ? 1 : 0,
        useNativeDriver: true,
        speed: 22,
        bounciness: 7,
      }),
    ]).start();
  }, [active]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 30,
      bounciness: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: active ? 1 : 0.94,
      useNativeDriver: true,
      speed: 24,
      bounciness: 7,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className="flex-1 items-center justify-center"
    >
      <Animated.View
        className={`min-h-[56px] min-w-[58px] items-center justify-center rounded-clay-sm px-[7px] ${
          active ? "border border-white/90 bg-ocean-100 shadow-clay-sm" : ""
        }`}
        style={{
          transform: [{ scale }],
        }}
      >
        {active && (
          <Animated.View
            pointerEvents="none"
            className="absolute left-2 right-2 top-1 h-[2px] rounded-full bg-white"
            style={{
              opacity: activeScale,
              transform: [
                {
                  scale: activeScale.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.75, 1],
                  }),
                },
              ],
            }}
          />
        )}

        <View className="relative h-[25px] items-center justify-center">
          <Icon
            size={active ? 21 : 20}
            color={active ? colors.primaryDark : colors.textMuted}
            strokeWidth={active ? 2.5 : 2}
          />

          {badge !== undefined && badge > 0 && (
            <View className="absolute -right-[11px] -top-[7px] h-4 min-w-4 items-center justify-center rounded-full border-2 border-clay-surface bg-danger px-1">
              <Text className="text-[8px] font-extrabold text-white">
                {badge > 9 ? "9+" : badge}
              </Text>
            </View>
          )}
        </View>

        <Text
          className={`mt-[3px] text-[9px] ${
            active ? "font-bold text-ocean-700" : "font-medium text-ink-muted"
          }`}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function ClayTabBar({
  state,
  descriptors,
  navigation,
}: ClayTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-0 left-0 right-0 px-4 pt-2"
      style={{
        paddingBottom: Math.max(insets.bottom, spacing.sm),
      }}
    >
      <View className="relative min-h-[72px] flex-row items-center rounded-[32px] border border-white/95 bg-clay-surface px-2 py-2 shadow-clay">
        <View
          pointerEvents="none"
          className="absolute left-[30px] right-[30px] top-[1px] h-[2px] rounded-full bg-white"
        />

        {tabs.map((tab) => {
          const routeIndex = state.routes.findIndex(
            (route: any) => route.name === tab.name,
          );
          if (routeIndex === -1) return null;

          const route = state.routes[routeIndex];
          const isFocused = state.index === routeIndex;
          const { options } = descriptors[route.key];

          // ✅ Fixed: removed navigation.emit, use navigate directly
          const onPress = () => {
            if (!isFocused) {
              navigation.navigate(route.name);
            }
          };

          return (
            <ClayTab
              key={route.key}
              active={isFocused}
              label={
                typeof options.tabBarLabel === "string"
                  ? options.tabBarLabel
                  : tab.label
              }
              Icon={tab.icon}
              onPress={onPress}
              badge={tab.name === "notifications" ? 2 : undefined}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Layout wrapper with Tabs ──────────────────────────────────────────
export function CommuterTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <ClayTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: "shift",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="queue" options={{ title: "Queue" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

export default CommuterTabsLayout;
