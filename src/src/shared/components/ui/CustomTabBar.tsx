// src/shared/components/ui/CustomTabBar.tsx
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../../shared/context/ThemeContext";

type CustomTabBarProps = {
  state: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  descriptors: Record<string, { options: any }>;
  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented?: boolean };
    navigate: (name: string) => void;
  };
};

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: CustomTabBarProps) {
  const { isDark } = useTheme();

  // iOS‑style tab bar with card‑matching dark mode
  const bgColor = isDark ? "bg-slate-800" : "bg-white/95";
  const borderColor = isDark ? "border-slate-700" : "border-slate-200";
  const activeColor = "#0ea5e9";
  const inactiveColor = isDark ? "#94a3b8" : "#64748b";
  const textColor = isDark ? "text-slate-400" : "text-slate-500";
  const activeTextColor = "text-sky-500";
  const badgeBorderColor = isDark ? "border-slate-800" : "border-white";

  return (
    <View
      className={`${bgColor} flex-row border-t ${borderColor} items-center justify-around px-2 pb-3 pt-2`}
      style={
        Platform.OS === "ios"
          ? {
              backgroundColor: isDark
                ? "rgba(30, 41, 59, 0.95)"
                : "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
            }
          : {}
      }
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        const icon = options.tabBarIcon?.({
          focused: isFocused,
          color: isFocused ? activeColor : inactiveColor,
          size: 26, // iOS‑sized icons
        });

        const badge = options.tabBarBadge;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            className="items-center py-1 px-2"
            style={{ minWidth: 60 }}
          >
            <View className="relative">
              {icon}
              {badge && (
                <View
                  className={`absolute -top-1 -right-2 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border-2 ${badgeBorderColor}`}
                >
                  <Text className="text-white text-[10px] font-bold">
                    {badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              className={`text-xs mt-1 font-medium ${
                isFocused ? activeTextColor : textColor
              }`}
            >
              {options.title || route.name}
            </Text>
            {/* iOS‑style active indicator dot */}
            {isFocused && (
              <View className="w-1 h-1 rounded-full bg-sky-500 mt-0.5" />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
