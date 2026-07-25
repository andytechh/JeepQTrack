// src/shared/components/ui/Header.tsx
import { LogOut, LucideIcon, Menu } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View, ViewProps } from "react-native";

interface HeaderProps extends ViewProps {
  title: string;
  subtitle?: string;
  rightIcon?: LucideIcon;
  onRightPress?: () => void;
  showLogout?: boolean;
  onLogout?: () => void;
  showMenu?: boolean;
  onMenuPress?: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  rightIcon: RightIcon,
  onRightPress,
  showLogout = false,
  onLogout,
  showMenu = false,
  onMenuPress,
  className = "",
  children,
  ...props
}) => {
  return (
    <View className={`bg-primary-500 px-4 pt-12 pb-4 ${className}`} {...props}>
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center">
          {showMenu && (
            <TouchableOpacity onPress={onMenuPress} className="mr-3">
              <Menu size={24} color="white" />
            </TouchableOpacity>
          )}
          <View>
            <Text className="text-white/80 text-sm">{subtitle}</Text>
            <Text className="text-white text-2xl font-bold">{title}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          {RightIcon && (
            <TouchableOpacity onPress={onRightPress} className="p-2">
              <RightIcon size={24} color="white" />
            </TouchableOpacity>
          )}
          {showLogout && (
            <TouchableOpacity onPress={onLogout} className="p-2">
              <LogOut size={22} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {children}
    </View>
  );
};
