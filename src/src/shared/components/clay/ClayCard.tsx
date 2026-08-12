import React from "react";
import {
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";

import { colors, radius, shadows } from "../../constants/theme";

interface ClayCardProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radiusSize?: keyof typeof radius;
  shadow?: "none" | "small" | "default";
}

export function ClayCard({
  children,
  style,
  padding = 20,
  radiusSize = "xxl",
  shadow = "default",
  ...props
}: ClayCardProps) {
  const shadowStyle =
    shadow === "none"
      ? {}
      : shadow === "small"
        ? shadows.claySmall
        : shadows.clay;

  return (
    <View
      {...props}
      style={[
        styles.base,
        {
          padding,
          borderRadius: radius[radiusSize],
        },
        shadowStyle,
        style,
      ]}
    >
      <View pointerEvents="none" style={styles.highlight} />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    position: "relative",
    overflow: "hidden",

    backgroundColor: colors.surface,

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },

  highlight: {
    position: "absolute",

    top: 0,
    left: 0,
    right: 0,

    height: 1,

    backgroundColor: "rgba(255,255,255,0.95)",
  },
});
