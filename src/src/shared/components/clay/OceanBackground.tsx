import React from "react";
import { StyleProp, View, ViewProps, ViewStyle } from "react-native";

import { DonsolOcean } from "../../assets/svg/DonsolOcean";

interface OceanBackgroundProps extends ViewProps {
  children: React.ReactNode;
  intensity?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export default function OceanBackground({
  children,
  intensity = 0.35,
  className = "",
  style,
  ...props
}: OceanBackgroundProps) {
  return (
    <View
      {...props}
      style={style}
      className={`flex-1 bg-clay-background ${className}`}
    >
      <View pointerEvents="none" className="absolute inset-0">
        <DonsolOcean width="100%" height="100%" opacity={intensity} />
      </View>

      <View className="flex-1">{children}</View>
    </View>
  );
}
