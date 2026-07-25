// src/shared/components/ui/StatusBadge.tsx
import React from "react";
import { Text, View } from "react-native";

type StatusType =
  "waiting" | "en_route" | "arrived" | "dispatched" | "inactive";

interface StatusBadgeProps {
  status: StatusType;
  size?: "sm" | "md" | "lg";
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  { color: string; bg: string; text: string; dot: string }
> = {
  waiting: {
    color: "text-green-700",
    bg: "bg-green-100",
    text: "Waiting",
    dot: "bg-green-500",
  },
  en_route: {
    color: "text-blue-700",
    bg: "bg-blue-100",
    text: "En Route",
    dot: "bg-blue-500",
  },
  arrived: {
    color: "text-purple-700",
    bg: "bg-purple-100",
    text: "Arrived",
    dot: "bg-purple-500",
  },
  dispatched: {
    color: "text-orange-700",
    bg: "bg-orange-100",
    text: "Dispatched",
    dot: "bg-orange-500",
  },
  inactive: {
    color: "text-gray-700",
    bg: "bg-gray-100",
    text: "Inactive",
    dot: "bg-gray-400",
  },
};

const sizeClasses = {
  sm: "px-2 py-0.5 rounded-full",
  md: "px-3 py-1 rounded-full",
  lg: "px-4 py-1.5 rounded-full",
};

const textSizes = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

const dotSizes = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
  showDot = true,
  className = "",
}) => {
  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <View
      className={`flex-row items-center ${config.bg} ${sizeClasses[size]} ${className}`}
    >
      {showDot && (
        <View
          className={`rounded-full mr-1.5 ${config.dot} ${dotSizes[size]}`}
        />
      )}
      <Text className={`${config.color} ${textSizes[size]} font-medium`}>
        {config.text}
      </Text>
    </View>
  );
};
