import {
  Bell,
  House,
  Map,
  MessageCircle,
  Ticket,
  UserRound,
} from "lucide-react-native";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../../shared/context/ThemeContext";

type ClayTabBarProps = {
  state: {
    index: number;
    routes: Array<{
      key: string;
      name: string;
    }>;
  };

  notificationBadge?: number;

  descriptors: Record<
    string,
    {
      options: any;
    }
  >;

  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => {
      defaultPrevented?: boolean;
    };

    navigate: (name: string) => void;
  };
};

export function ClayTabBar({
  state,
  descriptors,
  navigation,
  notificationBadge = 0,
}: ClayTabBarProps) {
  const { isDark } = useTheme();

  const backgroundColor = isDark ? "#172033" : "#F8FCFF";
  const borderColor = isDark ? "#263449" : "rgba(255,255,255,0.95)";
  const activeBackground = isDark ? "#164E63" : "#E0F2FE";
  const activeColor = "#0EA5E9";
  const inactiveColor = isDark ? "#94A3B8" : "#64748B";
  const activeTextColor = isDark ? "#38BDF8" : "#0369A1";
  const inactiveTextColor = isDark ? "#94A3B8" : "#64748B";
  const badgeBorderColor = isDark ? "#172033" : "#FFFFFF";

  const renderIcon = (routeName: string, focused: boolean) => {
    const color = focused ? activeColor : inactiveColor;
    const size = focused ? 22 : 21;
    const strokeWidth = focused ? 2.7 : 2.1;

    switch (routeName) {
      case "index":
        return <House size={size} color={color} strokeWidth={strokeWidth} />;

      case "queue":
        return <Ticket size={size} color={color} strokeWidth={strokeWidth} />;

      case "map":
        return <Map size={size} color={color} strokeWidth={strokeWidth} />;
      case "chat":
        return (
          <MessageCircle size={size} color={color} strokeWidth={strokeWidth} />
        );

      case "notifications":
        return <Bell size={size} color={color} strokeWidth={strokeWidth} />;

      case "profile":
        return (
          <UserRound size={size} color={color} strokeWidth={strokeWidth} />
        );

      default:
        return null;
    }
  };

  return (
    <View
      className="absolute bottom-0 left-0 right-0 px-4 pt-2"
      style={{
        paddingBottom: Platform.OS === "ios" ? 20 : 10,
      }}
    >
      <View
        className="relative flex-row items-center justify-around px-2"
        style={{
          height: 82,
          borderRadius: 30,
          borderWidth: 1,
          borderColor,
          backgroundColor,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: isDark ? 0.25 : 0.1,
          shadowRadius: 16,
          elevation: 8,
          overflow: "visible",
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 1,
            left: 30,
            right: 30,
            height: 2,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.95)",
          }}
        />

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

          const label = options.tabBarLabel || options.title || route.name;

          const badge =
            route.name === "notifications"
              ? notificationBadge
              : options.tabBarBadge;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={
                isFocused
                  ? {
                      selected: true,
                    }
                  : {}
              }
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.75}
              className="flex-1 items-center justify-center"
              style={{
                minWidth: 60,
              }}
            >
              <View
                className="items-center justify-center"
                style={{
                  width: route.name === "queue" ? 70 : 58,
                  height: 56,
                  borderRadius: 17,
                  backgroundColor: isFocused ? activeBackground : "transparent",
                  borderWidth: isFocused ? 1 : 0,
                  borderColor: isFocused
                    ? "rgba(255,255,255,0.95)"
                    : "transparent",
                  shadowColor: isFocused ? "#000" : "transparent",
                  shadowOffset: {
                    width: 0,
                    height: isFocused ? 2 : 0,
                  },
                  shadowOpacity: isFocused ? 0.06 : 0,
                  shadowRadius: isFocused ? 4 : 0,
                  elevation: isFocused ? 2 : 0,
                }}
              >
                {isFocused && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: 3,
                      left: 10,
                      right: 10,
                      height: 2,
                      borderRadius: 999,
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                )}

                <View
                  className="relative items-center justify-center"
                  style={{
                    height: 27,
                    width: 27,
                  }}
                >
                  {renderIcon(route.name, isFocused)}

                  {badge !== undefined &&
                    badge !== null &&
                    Number(badge) > 0 && (
                      <View
                        className="absolute items-center justify-center rounded-full bg-red-500"
                        style={{
                          right: -9,
                          top: -7,
                          minWidth: 18,
                          height: 18,
                          paddingHorizontal: 4,
                          borderWidth: 2,
                          borderColor: badgeBorderColor,
                        }}
                      >
                        <Text className="text-[9px] font-extrabold text-white">
                          {Number(badge) > 99 ? "99+" : String(badge)}
                        </Text>
                      </View>
                    )}
                </View>

                <Text
                  style={{
                    marginTop: 3,
                    fontSize: 9,
                    fontWeight: isFocused ? "800" : "600",
                    color: isFocused ? activeTextColor : inactiveTextColor,
                  }}
                >
                  {String(label)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default ClayTabBar;
