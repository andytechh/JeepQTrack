// src/shared/components/ui/EmptyState.tsx
import { LucideIcon } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <View className={`items-center justify-center p-6 ${className}`}>
      <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
        <Icon size={40} color="#9CA3AF" />
      </View>
      <Text className="text-xl font-bold text-gray-800 text-center">
        {title}
      </Text>
      <Text className="text-gray-500 text-center text-sm mt-1">
        {description}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          className="mt-4 bg-primary-500 px-6 py-2.5 rounded-xl"
          onPress={onAction}
        >
          <Text className="text-white font-medium">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
