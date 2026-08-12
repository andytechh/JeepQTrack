import { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from "../../constants/theme";

interface ClayButtonProps {
  title: string;
  onPress: () => void;

  variant?: "primary" | "secondary" | "ghost";
  size?: "small" | "medium" | "large";

  disabled?: boolean;
  loading?: boolean;

  style?: StyleProp<ViewStyle>;
}

export function ClayButton({
  title,
  onPress,
  variant = "primary",
  size = "large",
  disabled = false,
  loading = false,
  style,
}: ClayButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 8,
    }).start();
  };

  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ scale }],
        },
        style,
      ]}
    >
      <Pressable
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,

          size === "small" && styles.small,
          size === "medium" && styles.medium,
          size === "large" && styles.large,

          isPrimary && styles.primary,
          isSecondary && styles.secondary,
          variant === "ghost" && styles.ghost,

          (disabled || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={isPrimary ? colors.surfaceBright : colors.primaryDark}
          />
        ) : (
          <Text
            style={[
              styles.text,

              isPrimary && styles.primaryText,
              isSecondary && styles.secondaryText,
              variant === "ghost" && styles.ghostText,
            ]}
          >
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.pill,
  },

  button: {
    alignItems: "center",
    justifyContent: "center",

    flexDirection: "row",

    borderRadius: radius.pill,

    borderWidth: 1,
  },

  small: {
    minHeight: 42,
    paddingHorizontal: spacing.xl,
  },

  medium: {
    minHeight: 50,
    paddingHorizontal: spacing.xxl,
  },

  large: {
    minHeight: 58,
    paddingHorizontal: spacing.xxxl,
  },

  primary: {
    backgroundColor: colors.primary,

    borderColor: "rgba(255,255,255,0.7)",

    ...shadows.floating,
  },

  secondary: {
    backgroundColor: colors.surface,

    borderColor: colors.primaryLight,

    ...shadows.claySmall,
  },

  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },

  disabled: {
    opacity: 0.5,
  },

  text: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.weight.bold,
  },

  primaryText: {
    color: colors.surfaceBright,
  },

  secondaryText: {
    color: colors.primaryDark,
  },

  ghostText: {
    color: colors.primaryDark,
  },
});
