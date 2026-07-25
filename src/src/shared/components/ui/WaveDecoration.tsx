// src/shared/components/ui/WaveDecoration.tsx
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface WaveDecorationProps {
  color?: string;
  style?: any;
}

export const WaveDecoration: React.FC<WaveDecorationProps> = ({
  color = "rgba(255,255,255,0.08)",
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Svg viewBox="0 0 390 120" style={styles.svg} preserveAspectRatio="none">
        <Path
          d="M0,60 C80,100 160,20 240,60 C320,100 360,40 390,60 L390,120 L0,120 Z"
          fill={color}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
  },
  svg: {
    width: "100%",
    height: 60,
  },
});
