// src/shared/components/ui/StatsCard.tsx
import { LucideIcon } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { Card } from "./Card";

interface StatsCardProps {
  icon: LucideIcon;
  iconColor?: string;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  icon: Icon,
  iconColor = "#208AEF",
  label,
  value,
  subtext,
  trend,
  trendValue,
  className = "",
}) => {
  const trendColors = {
    up: "text-green-500",
    down: "text-red-500",
    neutral: "text-yellow-500",
  };

  const trendIcons = {
    up: "↑",
    down: "↓",
    neutral: "→",
  };

  return (
    <Card variant="stats" className={`flex-1 ${className}`}>
      <View className="flex-row items-center gap-2 mb-1">
        <Icon size={18} color={iconColor} />
        <Text className="text-gray-500 text-xs font-medium">{label}</Text>
      </View>
      <Text className="text-3xl font-bold text-gray-800">{value}</Text>
      {subtext && <Text className="text-gray-400 text-xs mt-1">{subtext}</Text>}
      {trend && trendValue && (
        <View className="flex-row items-center mt-1">
          <Text className={`text-xs font-medium ${trendColors[trend]}`}>
            {trendIcons[trend]} {trendValue}
          </Text>
        </View>
      )}
    </Card>
  );
};
