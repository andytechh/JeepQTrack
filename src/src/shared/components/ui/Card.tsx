// src/shared/components/Card.tsx
import React from "react";
import { View, ViewStyle } from "react-native";
import { lightTheme, theme } from "../../constants/theme";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "primary" | "accent";
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = "default",
}) => {
  const getBackground = () => {
    if (variant === "primary") return theme.colors.primary[500];
    if (variant === "accent") return lightTheme.surfaceSecondary;
    return lightTheme.surface;
  };

  return (
    <View
      style={[
        {
          backgroundColor: getBackground(),
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
