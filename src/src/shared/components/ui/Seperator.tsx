import React from "react";
import { View } from "react-native";
import { lightTheme, theme } from "../../constants/theme";

export const Separator: React.FC = () => (
  <View
    style={{
      height: 1,
      backgroundColor: lightTheme.border,
      marginHorizontal: theme.spacing.md,
    }}
  />
);
