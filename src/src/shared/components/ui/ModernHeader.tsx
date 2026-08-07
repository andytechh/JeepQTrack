// src/shared/components/ui/ModernHeader.tsx
import { Bell, Bus } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../../shared/context/ThemeContext";

interface ModernHeaderProps {
  avatarText?: string;
  notificationCount?: number;
  onNotificationPress?: () => void;
  onAvatarPress?: () => void;
  children?: React.ReactNode;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  avatarText = "JD",
  notificationCount = 0,
  onNotificationPress,
  onAvatarPress,
  children,
}) => {
  const { isDark } = useTheme();

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Dynamic styles based on theme
  const bgColor = isDark ? "bg-slate-800" : "bg-sky-500";
  const textColor = isDark ? "text-slate-100" : "text-[#ffffff]";
  const badgeBorderColor = isDark ? "border-slate-800" : "border-sky-500";
  const avatarBg = isDark ? "bg-slate-700" : "bg-white/20";
  const avatarBorder = isDark ? "border-slate-600" : "border-white/30";

  return (
    <View
      className={`${bgColor} px-4 pt-10  mt-0 pb-6 border-b ${isDark ? "border-slate-700" : "border-white/5"}`}
    >
      <View className="flex-row items-center justify-between">
        {/* Logo */}
        <View className="flex-row items-center">
          <View className="flex-row gap-2 rounded-lg items-center justify-center mr-2">
            <Bus size={32} color={isDark ? "#94a3b8" : "#ffffff"} />
            <Text className={`${textColor} font-bold text-3xl `}>JeepQs</Text>
          </View>
        </View>

        {/* Right side */}
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={onNotificationPress}
            className="relative p-1"
          >
            <Bell size={27} color={isDark ? "#94a3b8" : "#EAE0CF"} />
            {notificationCount > 0 && (
              <View
                className={`absolute -top-0.5 -right-0.5 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center border-2 ${badgeBorderColor}`}
              >
                <Text className="text-black text-[10px] font-bold">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onAvatarPress}
            className={`w-9 h-9 rounded-full items-center justify-center border ${avatarBg} ${avatarBorder}`}
          >
            <Text className={`${textColor} font-bold text-sm`}>
              {getInitials(avatarText)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {children}
    </View>
  );
};
