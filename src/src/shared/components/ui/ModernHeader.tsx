// src/shared/components/ui/ModernHeader.tsx
import { Bell } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

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
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View className="bg-primary-500 px-4 pt-5 pb-6">
      <View className="flex-row items-center justify-between">
        {/* Logo */}
        <View className="flex-row items-center">
          <View className=" bg-[#4B5694]/20 rounded-lg items-center justify-center mr-2">
            <Text className="text-[#EAE0CF] font-bold text-3xl">
              JeepQs Track
            </Text>
          </View>
        </View>

        {/* Right side */}
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={onNotificationPress}
            className="relative p-1"
          >
            <Bell size={27} color="#EAE0CF" />
            {notificationCount > 0 && (
              <View className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center border-2 border-primary-500">
                <Text className="text-black text-[10px] font-bold">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onAvatarPress}
            className="w-9 h-9 bg-white/20 rounded-full items-center justify-center border border-white/30"
          >
            <Text className="text-[#EAE0CF]  font-bold text-sm">
              {getInitials(avatarText)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {children}
    </View>
  );
};
