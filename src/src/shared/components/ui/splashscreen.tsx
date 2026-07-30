// src/shared/components/SplashScreen.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

const { width, height } = Dimensions.get("window");

// ─── WAVE DECORATION ──────────────────────────────────────────────
const WaveDecoration = ({ color, style }: any) => (
  <View
    style={[
      {
        position: "absolute",
        left: 0,
        right: 0,
        height: 60,
        overflow: "hidden",
      },
      style,
    ]}
  >
    <Svg
      viewBox="0 0 400 60"
      style={{ width: "100%", height: "100%" }}
      preserveAspectRatio="none"
    >
      <Path
        d="M0,30 C60,60 120,0 200,30 C280,60 340,0 400,30 L400,60 L0,60 Z"
        fill={color || "rgba(255,255,255,0.06)"}
      />
    </Svg>
  </View>
);

// ─── SPLASH COMPONENT ─────────────────────────────────────────────
interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
  appName?: string;
  subtitle?: string;
}

export default function SplashScreen({
  onComplete,
  duration = 3000,
  appName = "Smart JeepQ Track",
  subtitle = "Donsol – Daraga Terminal",
}: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const logoAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(logoAnim, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after duration
    if (onComplete) {
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          onComplete();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, []);

  // ─── LOADING DOTS ──────────────────────────────────────────────
  const LoadingDots = () => {
    const dotAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.ease,
          }),
          Animated.timing(dotAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.ease,
          }),
        ]),
      ).start();
    }, []);

    return (
      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
        {[0, 1, 2, 3].map((i) => {
          const isActive = i === 1;
          return (
            <Animated.View
              key={i}
              style={{
                width: isActive ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: isActive ? "white" : "rgba(255,255,255,0.3)",
                transform: [
                  {
                    scale: isActive
                      ? dotAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [1, 1.2, 1],
                        })
                      : 1,
                  },
                ],
              }}
            />
          );
        })}
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* ─── BACKGROUND ───────────────────────────────────────────── */}
      <LinearGradient
        colors={["#0c4a6e", "#0369a1", "#0ea5e9", "#38bdf8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      {/* ─── AMBIENT CIRCLES ──────────────────────────────────────── */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />
      <View style={[styles.circle, styles.circle3]} />

      {/* ─── WHALE SHARK SILHOUETTE ────────────────────────────────── */}
      <Svg
        width="200"
        height="90"
        viewBox="0 0 200 90"
        style={styles.sharkIcon}
      >
        <Path
          d="M10,45 C20,20 50,10 100,12 C150,14 175,30 188,45 C175,60 150,76 100,78 C50,80 20,70 10,45 Z"
          fill="white"
          opacity={0.18}
        />
        <Path
          d="M188,45 L200,30 L190,45 L200,60 Z"
          fill="white"
          opacity={0.18}
        />
        <Circle cx="155" cy="35" r="3" fill="rgba(0,0,0,0.3)" />
        <Circle cx="80" cy="42" r="4" fill="rgba(255,255,255,0.3)" />
        <Circle cx="100" cy="35" r="3" fill="rgba(255,255,255,0.3)" />
        <Circle cx="115" cy="50" r="5" fill="rgba(255,255,255,0.3)" />
        <Circle cx="65" cy="52" r="3" fill="rgba(255,255,255,0.3)" />
        <Circle cx="90" cy="58" r="4" fill="rgba(255,255,255,0.3)" />
        <Circle cx="130" cy="42" r="3" fill="rgba(255,255,255,0.3)" />
      </Svg>

      {/* ─── LOGO ──────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: logoAnim }],
          },
        ]}
      >
        <View style={styles.logo}>
          <Svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <Path
              d="M6 36 L6 28 C6 26 7 24 9 24 L24 24 L24 16 C24 14 25 12 27 12 L42 12"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <Circle cx="12" cy="36" r="5" fill="white" />
            <Circle cx="28" cy="36" r="5" fill="white" />
            <Path
              d="M6 36 L42 36"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <Circle cx="35" cy="20" r="3" fill="rgba(255,255,255,0.7)" />
            <Circle cx="35" cy="28" r="3" fill="rgba(255,255,255,0.7)" />
          </Svg>
        </View>
      </Animated.View>

      {/* ─── BRAND TEXT ───────────────────────────────────────────── */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>{appName}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Text style={styles.footer}>
        Powered by Computers Arts and Technological College
      </Text>

      {/* ─── LOADING INDICATOR ────────────────────────────────────── */}
      <LoadingDots />

      {/* ─── WAVE DECORATIONS ─────────────────────────────────────── */}
      <WaveDecoration color="rgba(255,255,255,0.06)" style={{ bottom: 0 }} />
      <WaveDecoration color="rgba(255,255,255,0.04)" style={{ bottom: 20 }} />
    </Animated.View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: "absolute",
    borderRadius: 999,
  },
  circle1: {
    top: -60,
    right: -60,
    width: 280,
    height: 280,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  circle2: {
    top: 40,
    right: -80,
    width: 180,
    height: 180,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  circle3: {
    bottom: -40,
    left: -60,
    width: 240,
    height: 240,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sharkIcon: {
    marginBottom: 8,
    opacity: 0.18,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 48,
    elevation: 16,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.84,
    lineHeight: 32,
  },
  subtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
    letterSpacing: 1.44,
    textTransform: "uppercase",
  },
  footer: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginBottom: 64,
    letterSpacing: 0.88,
  },
});
