// src/shared/components/ui/StatusPill.tsx
import React from "react";
import { Text, View } from "react-native";

interface StatusPillProps {
  status:
    | "active"
    | "completed"
    | "cancelled"
    | "pending"
    | "in_progress"
    | "online"
    | "offline"
    | "waiting"
    | "loading"
    | "en_route"
    | "arrived"
    | "dispatched"
    | "inactive";
  dot?: boolean;
  isDark?: boolean;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  dot = true,
  isDark = false,
}) => {
  const getStatusColor = (): string => {
    switch (status) {
      case "active":
      case "online":
      case "completed":
      case "arrived":
        return "#22c55e"; // green-500
      case "in_progress":
      case "pending":
      case "waiting":
      case "loading":
        return "#eab308"; // yellow-500
      case "en_route":
        return "#3b82f6"; // blue-500
      case "cancelled":
      case "offline":
      case "inactive":
      case "dispatched":
        return "#ef4444"; // red-500
      default:
        return "#94a3b8"; // slate-400
    }
  };

  const color = getStatusColor();
  const bgColor = isDark ? `${color}30` : `${color}20`;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: bgColor,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
      }}
    >
      {dot && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: color,
            marginRight: 6,
          }}
        />
      )}
      <Text
        style={{
          fontSize: 12,
          color,
          fontWeight: "500",
          textTransform: "capitalize",
        }}
      >
        {status.replace("_", " ")}
      </Text>
    </View>
  );
};
