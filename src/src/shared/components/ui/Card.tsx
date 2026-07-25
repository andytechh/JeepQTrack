// src/shared/components/ui/Card.tsx
import React from "react";
import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  variant?: "default" | "stats" | "action" | "elevated";
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = "default",
  className = "",
  children,
  ...props
}) => {
  const variants = {
    default: "bg-white rounded-2xl p-4",
    stats: "bg-white rounded-2xl p-4 shadow-sm",
    action: "bg-white rounded-2xl p-4 shadow-sm border border-gray-100",
    elevated: "bg-white rounded-2xl p-4 shadow-lg",
  };

  return (
    <View className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </View>
  );
};
