import React from "react";
import { Text, View } from "react-native";

interface DividerProps {
  title?: string;
  className?: string;
}
export const Divider: React.FC<DividerProps> = ({ title, className = "" }) => {
  if (title) {
    return (
      <View className={`flex-row items-center my-3 ${className}`}>
        <View className="flex-1 h-px bg-gray-200" />
        <Text className="text-gray-400 text-xs mx-4">{title}</Text>
        <View className="flex-1 h-px bg-gray-200" />
      </View>
    );
  }
  return <View className={`h-px bg-gray-200 my-3 ${className}`} />;
};
