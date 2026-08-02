import React from "react";
import { Text, View } from "react-native";
import { theme } from "../../constants/theme";

interface StatusPillProps {
  status:
    | "active"
    | "completed"
    | "cancelled"
    | "pending"
    | "in_progress"
    | "online"
    | "offline";
  dot?: boolean;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  dot = true,
}) => {
  const getColor = () => {
    switch (status) {
      case "active":
      case "online":
      case "completed":
        return theme.colors.status.online;
      case "in_progress":
      case "pending":
        return theme.colors.status.busy;
      case "cancelled":
      case "offline":
        return theme.colors.status.offline;
      default:
        return theme.colors.status.offline;
    }
  };

  const color = getColor();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: `${color}20`,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
      }}
    >
      {dot && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: theme.borderRadius.full,
            backgroundColor: color,
            marginRight: theme.spacing.xs,
          }}
        />
      )}
      <Text
        style={{
          fontSize: theme.typography.sizes.sm,
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
