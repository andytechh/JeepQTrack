import React from "react";
import { View } from "react-native";
import { lightTheme, theme } from "../../constants/theme";

interface ProgressProps {
  value: number;
  max?: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  color = theme.colors.primary[500],
  trackColor = lightTheme.border,
  height = 6,
}) => {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <View
      style={{
        width: "100%",
        height,
        backgroundColor: trackColor,
        borderRadius: theme.borderRadius.sm,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${percent}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: theme.borderRadius.sm,
        }}
      />
    </View>
  );
};
