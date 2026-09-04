import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from "lucide-react-native";

import {
  colors,
  radius,
  shadows,
  typography
} from "../../constants/theme";

interface ClayAlertProps {
  visible: boolean;
  type?: "error" | "success" | "warning" | "info";
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

export default function ClayAlert({
  visible,
  type = "info",
  title,
  message,
  buttonText = "Okay",
  onClose,
}: ClayAlertProps) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.88);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 22,
          bounciness: 7,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: CheckCircle2,
          iconBackground: "#dcfce7",
          iconColor: "#16a34a",
          accent: "#22c55e",
        };

      case "warning":
        return {
          icon: TriangleAlert,
          iconBackground: "#fef3c7",
          iconColor: "#d97706",
          accent: "#f59e0b",
        };

      case "error":
        return {
          icon: AlertCircle,
          iconBackground: "#fee2e2",
          iconColor: "#dc2626",
          accent: "#ef4444",
        };

      default:
        return {
          icon: Info,
          iconBackground: "#e0f2fe",
          iconColor: colors.primary,
          accent: colors.primary,
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          {/* Top clay highlight */}
          <View pointerEvents="none" style={styles.highlight} />

          {/* Close button */}
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={10}>
            <X size={18} color="#94a3b8" />
          </Pressable>

          {/* Icon */}
          <View
            style={[
              styles.iconOuter,
              {
                backgroundColor: config.iconBackground,
                borderColor: `${config.accent}22`,
              },
            ]}
          >
            <View
              style={[
                styles.iconInner,
                {
                  backgroundColor: `${config.accent}15`,
                },
              ]}
            >
              <Icon size={30} color={config.iconColor} strokeWidth={2.3} />
            </View>
          </View>

          {/* Content */}
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.message}>{message}</Text>

          {/* Button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 24,

    backgroundColor: "rgba(15, 23, 42, 0.48)",
  },

  card: {
    width: "100%",
    maxWidth: 390,

    position: "relative",
    overflow: "hidden",

    padding: 24,

    borderRadius: radius.xxl,

    backgroundColor: colors.surface,

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",

    ...shadows.clay,
  },

  highlight: {
    position: "absolute",

    top: 0,
    left: 18,
    right: 18,

    height: 2,

    borderRadius: 2,

    backgroundColor: "rgba(255,255,255,0.95)",
  },

  closeButton: {
    position: "absolute",

    top: 16,
    right: 16,

    width: 36,
    height: 36,

    borderRadius: 18,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#f1f5f9",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",

    ...shadows.claySmall,
  },

  iconOuter: {
    width: 70,
    height: 70,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 24,

    borderWidth: 1,

    marginBottom: 18,

    ...shadows.claySmall,
  },

  iconInner: {
    width: 52,
    height: 52,

    borderRadius: 18,

    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: colors.text,

    fontSize: typography.fontSize.xl,
    fontWeight: typography.weight.bold,

    marginBottom: 8,

    paddingRight: 30,
  },

  message: {
    color: colors.textSecondary,

    fontSize: typography.fontSize.md,

    lineHeight: 21,

    marginBottom: 22,
  },

  button: {
    minHeight: 52,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: radius.pill,

    backgroundColor: colors.primary,

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",

    ...shadows.floating,
  },

  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },

  buttonText: {
    color: colors.surfaceBright,

    fontSize: typography.fontSize.md,
    fontWeight: typography.weight.bold,
  },
});
