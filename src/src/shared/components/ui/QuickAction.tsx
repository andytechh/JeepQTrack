// src/shared/components/ui/QuickAction.tsx
import { LucideIcon } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity } from "react-native";

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "success" | "danger" | "warning";
  className?: string;
}

const variantStyles = {
  primary: "bg-primary-500",
  secondary: "bg-blue-500",
  success: "bg-green-500",
  danger: "bg-red-500",
  warning: "bg-yellow-500",
};

export const QuickAction: React.FC<QuickActionProps> = ({
  icon: Icon,
  label,
  description,
  onPress,
  variant = "primary",
  className = "",
}) => {
  return (
    <TouchableOpacity
      className={`flex-1 rounded-2xl p-4 items-center ${variantStyles[variant]} ${className}`}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon size={28} color="white" />
      <Text className="text-white text-sm mt-2 font-medium">{label}</Text>
      {description && (
        <Text className="text-white/70 text-xs">{description}</Text>
      )}
    </TouchableOpacity>
  );
};
