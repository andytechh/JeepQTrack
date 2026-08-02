import React from "react";
import {
  ActivityIndicator,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { theme } from "../../constants/theme";

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "link";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const getColors = () => {
    switch (variant) {
      case "primary":
        return {
          bg: theme.colors.primary[500],
          text: "#fff",
          border: "transparent",
        };
      case "secondary":
        return {
          bg: "transparent",
          text: theme.colors.primary[500],
          border: theme.colors.primary[500],
        };
      case "danger":
        return {
          bg: theme.colors.status.error,
          text: "#fff",
          border: "transparent",
        };
      case "link":
        return {
          bg: "transparent",
          text: theme.colors.primary[500],
          border: "transparent",
        };
      default:
        return {
          bg: theme.colors.primary[500],
          text: "#fff",
          border: "transparent",
        };
    }
  };

  const getPadding = () => {
    switch (size) {
      case "sm":
        return { paddingVertical: 6, paddingHorizontal: 12 };
      case "lg":
        return { paddingVertical: 14, paddingHorizontal: 24 };
      default:
        return { paddingVertical: 10, paddingHorizontal: 20 };
    }
  };

  const colors = getColors();
  const padding = getPadding();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: colors.bg,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: colors.border,
          borderRadius: theme.borderRadius.md,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          opacity: disabled ? 0.5 : 1,
          ...padding,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <Text style={[{ color: colors.text, fontWeight: "600" }, textStyle]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};
