import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

interface JeepQLaunchSplashProps {
  isAppReady: boolean;
  onComplete?: () => void;
  minimumDuration?: number;
}

/** A wordmark-only launch screen that waits for app startup before leaving. */
export default function JeepQLaunchSplash({
  isAppReady,
  onComplete,
  minimumDuration = 5200,
}: JeepQLaunchSplashProps) {
  const completionRef = useRef(onComplete);
  const hasCompleted = useRef(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.76)).current;
  const logoTranslateY = useRef(new Animated.Value(30)).current;
  const jeepProgress = useRef(new Animated.Value(0)).current;
  const [minimumDurationElapsed, setMinimumDurationElapsed] = useState(false);

  completionRef.current = onComplete;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        damping: 14,
        stiffness: 165,
        mass: 0.85,
        useNativeDriver: true,
      }),
      Animated.spring(logoTranslateY, {
        toValue: 0,
        damping: 15,
        stiffness: 135,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();

    const jeepLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(jeepProgress, {
          toValue: 1,
          duration: 4600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(450),
        Animated.timing(jeepProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    jeepLoop.start();

    const timer = setTimeout(
      () => setMinimumDurationElapsed(true),
      minimumDuration,
    );

    return () => {
      clearTimeout(timer);
      jeepLoop.stop();
    };
  }, [jeepProgress, logoScale, logoTranslateY, minimumDuration, opacity]);

  useEffect(() => {
    if (!isAppReady || !minimumDurationElapsed || hasCompleted.current) return;

    hasCompleted.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 420,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) completionRef.current?.();
    });
  }, [isAppReady, minimumDurationElapsed, opacity]);

  const jeepTranslateX = jeepProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-126, 126],
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { opacity }]}>
      <Animated.View
        style={[
          styles.brandPlate,
          {
            transform: [{ translateY: logoTranslateY }, { scale: logoScale }],
          },
        ]}
      >
        <Text accessibilityRole="header" style={styles.wordmark}>
          JeepQ
        </Text>
      </Animated.View>

      <View style={styles.routeSection}>
        <Text style={styles.loadingLabel}>Preparing your route</Text>
        <View style={styles.routeLabels}>
          <Text style={styles.routeLabel}>Donsol</Text>
          <Text style={styles.routeLabel}>Daraga</Text>
        </View>
        <View style={styles.routeTrack}>
          <View style={styles.routeLine} />
          <View style={[styles.stop, styles.startStop]} />
          <View style={[styles.stop, styles.endStop]} />
          <Animated.View
            accessibilityLabel="JeepQ travelling from Donsol to Daraga"
            style={[
              styles.routeMarker,
              { transform: [{ translateX: jeepTranslateX }] },
            ]}
          >
            <Text style={styles.routeMarkerText}>JeepQ</Text>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B6FA4",
  },
  brandPlate: {
    paddingHorizontal: 34,
    paddingVertical: 17,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.94)",
    backgroundColor: "rgba(5, 68, 105, 0.28)",
  },
  wordmark: {
    color: "#FFFFFF",
    fontSize: 54,
    fontWeight: "900",
    letterSpacing: -3.4,
    lineHeight: 62,
    textShadowColor: "rgba(0, 27, 45, 0.32)",
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 10,
  },
  routeSection: {
    width: 272,
    marginTop: 74,
  },
  loadingLabel: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.15,
    marginBottom: 13,
    textAlign: "center",
  },
  routeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  routeLabel: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    fontWeight: "700",
  },
  routeTrack: {
    height: 30,
    justifyContent: "center",
  },
  routeLine: {
    height: 3,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.42)",
  },
  stop: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  startStop: { left: 0 },
  endStop: { right: 0 },
  routeMarker: {
    position: "absolute",
    left: 109,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  routeMarkerText: {
    color: "#0B6FA4",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
});
