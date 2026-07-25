// src/shared/components/ui/LoadingSpinner.tsx
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  size?: "small" | "large";
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
  fullScreen = false,
  size = "large",
}) => {
  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size={size} color="#208AEF" />
        <Text className="mt-4 text-gray-500 font-medium">{message}</Text>
      </View>
    );
  }

  return (
    <View className="py-8 items-center justify-center">
      <ActivityIndicator size={size} color="#208AEF" />
      <Text className="mt-2 text-gray-500 text-sm">{message}</Text>
    </View>
  );
};
