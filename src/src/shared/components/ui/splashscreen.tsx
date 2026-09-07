import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop
} from "react-native-svg";

interface JeepQLaunchSplashProps {
  isAppReady: boolean;
  onComplete?: () => void;
  minimumDuration?: number;
}

/**
 * JeepQ claymorphism launch splash.
 *
 * Keeps the original animation and loading behavior while matching
 * the light ocean-blue claymorphism styling used by the Staff Login.
 */
export default function JeepQLaunchSplash({
  isAppReady,
  onComplete,
  minimumDuration = 9000,
}: JeepQLaunchSplashProps) {
  const completionRef = useRef(onComplete);
  const hasCompleted = useRef(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.9)).current;
  const badgeTranslateY = useRef(new Animated.Value(18)).current;
  const routeProgress = useRef(new Animated.Value(0)).current;
  const sheenProgress = useRef(new Animated.Value(0)).current;

  const [minimumDurationElapsed, setMinimumDurationElapsed] = useState(false);

  completionRef.current = onComplete;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScale, {
        toValue: 1,
        damping: 16,
        stiffness: 145,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.spring(badgeTranslateY, {
        toValue: 0,
        damping: 16,
        stiffness: 135,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();

    const routeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(routeProgress, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(800),
        Animated.timing(routeProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    const sheenLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(sheenProgress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(2200),
        Animated.timing(sheenProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    routeLoop.start();
    sheenLoop.start();

    const timer = setTimeout(
      () => setMinimumDurationElapsed(true),
      minimumDuration,
    );

    return () => {
      clearTimeout(timer);
      routeLoop.stop();
      sheenLoop.stop();
    };
  }, [
    badgeScale,
    badgeTranslateY,
    minimumDuration,
    opacity,
    routeProgress,
    sheenProgress,
  ]);

  useEffect(() => {
    if (!isAppReady || !minimumDurationElapsed || hasCompleted.current) {
      return;
    }

    hasCompleted.current = true;

    Animated.timing(opacity, {
      toValue: 0,
      duration: 460,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        completionRef.current?.();
      }
    });
  }, [isAppReady, minimumDurationElapsed, opacity]);

  const routeTranslateX = routeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 128],
  });

  const sheenTranslateX = sheenProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-310, 310],
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { opacity }]}>
      {/* Soft clay background details */}
      <View style={styles.decorCircleLarge} />
      <View style={styles.decorCircleSmall} />

      {/* Main JeepQ clay surface */}
      <Animated.View
        style={[
          styles.brandBadge,
          {
            transform: [{ translateY: badgeTranslateY }, { scale: badgeScale }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.sheen,
            {
              transform: [
                { translateX: sheenTranslateX },
                { rotate: "-16deg" },
              ],
            },
          ]}
        />

        <View pointerEvents="none" style={styles.brandHighlight} />

        <Text accessibilityRole="header" style={styles.wordmark}>
          JeepQ
        </Text>

        <View style={styles.wordmarkRule} />

        <Text style={styles.brandSubtitle}>SMART QUEUE</Text>
      </Animated.View>

      {/* Donsol → Daraga animated route */}
      <View style={styles.routeSection}>
        <Text style={styles.routeName}>DONSOL → DARAGA</Text>

        <View style={styles.routeTrack}>
          <View style={styles.routeTrackGlow} />
          <View style={styles.routeLine} />

          <Animated.View
            accessibilityLabel="Loading route from Donsol to Daraga"
            style={[
              styles.routeMarker,
              {
                transform: [{ translateX: routeTranslateX }],
              },
            ]}
          >
            <JeepneySVG />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

/* ================================================================
   ACTUAL JEEPNEY SVG
   ================================================================ */

function JeepneySVG() {
  // Compact traditional Philippine jeepney side profile.
  // Kept deliberately simple so it reads as a small loading marker,
  // rather than becoming the main visual element of the splash screen.
  return (
    <Svg width={62} height={31} viewBox="0 0 124 62">
      <Defs>
        <LinearGradient id="jeepChrome" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.55" stopColor="#D8E7EA" />
          <Stop offset="1" stopColor="#A7BBC1" />
        </LinearGradient>
        <LinearGradient id="jeepBlue" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#42B8E8" />
          <Stop offset="1" stopColor="#087AAE" />
        </LinearGradient>
      </Defs>

      {/* Traditional long chrome canopy */}
      <Path
        d="M8 17 Q10 9 20 8 H84 Q93 8 99 14 L102 17 Z"
        fill="url(#jeepChrome)"
        stroke="#657D85"
        strokeWidth="1.2"
      />
      <Path
        d="M9 14 Q12 6 21 6 H84 Q94 6 100 14 Z"
        fill="url(#jeepBlue)"
        stroke="#527580"
        strokeWidth="1"
      />
      <Path d="M11 16 H101" stroke="#EEF9FB" strokeWidth="2" />

      {/* Simple roof ribs */}
      <Path
        d="M25 8V16 M45 7V16 M65 7V16 M84 8V16"
        stroke="#D8F0F5"
        strokeWidth="1"
      />

      {/* Open passenger cabin and large windows */}
      <Path d="M15 17 H82 V31 H15 Z" fill="#24586B" />
      <Path d="M19 19 H36 V29 H19 Z" fill="#BDE8F5" />
      <Path d="M40 19 H57 V29 H40 Z" fill="#BDE8F5" />
      <Path d="M61 19 H78 V29 H61 Z" fill="#BDE8F5" />
      <Path
        d="M38 17V31 M59 17V31 M80 17V31"
        stroke="#D8F0F5"
        strokeWidth="1.5"
      />

      {/* Long low stainless-steel body */}
      <Path
        d="M10 29 H83 Q89 29 94 34 L99 38 H108 V45 H10 Q8 37 10 29 Z"
        fill="url(#jeepChrome)"
        stroke="#657D85"
        strokeWidth="1.2"
      />

      {/* Signature painted side band */}
      <Path d="M11 30 H84 Q90 30 94 35 L98 37 H11 Z" fill="url(#jeepBlue)" />
      <Path d="M12 33 H96" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.9" />

      {/* Rear entrance / step */}
      <Path
        d="M7 30 V46 H15 V37"
        fill="none"
        stroke="#087AAE"
        strokeWidth="3"
      />

      {/* Traditional compact driver's cab */}
      <Path
        d="M82 17 H91 L98 24 L100 35 H82 Z"
        fill="url(#jeepChrome)"
        stroke="#657D85"
        strokeWidth="1.1"
      />
      <Path
        d="M85 19 H90 L95 24 H85 Z"
        fill="#5C9EAF"
        stroke="#466C76"
        strokeWidth="0.8"
      />
      <Path
        d="M85 25 H96 L98 33 H85 Z"
        fill="#2D6478"
        stroke="#587681"
        strokeWidth="0.8"
      />

      {/* Classic short jeepney hood and upright grille */}
      <Path
        d="M97 32 H108 L114 37 V45 H100 L97 38 Z"
        fill="url(#jeepChrome)"
        stroke="#657D85"
        strokeWidth="1.1"
      />
      <Path
        d="M108 36 H115 V45 H108 Z"
        fill="#B9CBD0"
        stroke="#587078"
        strokeWidth="0.9"
      />
      <Path
        d="M109.5 37V44 M112 37V44 M114 37V44"
        stroke="#6A8087"
        strokeWidth="0.7"
      />

      {/* Round headlight + classic bumper */}
      <Circle
        cx="106"
        cy="36"
        r="2.5"
        fill="#FFF1A8"
        stroke="#5B737C"
        strokeWidth="0.9"
      />
      <Circle cx="106" cy="36" r="0.9" fill="#FFFFFF" />
      <Path
        d="M99 46 H117"
        stroke="#4F6871"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Mirror */}
      <Path
        d="M92 22 L101 17"
        stroke="#5B737C"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <Circle
        cx="102"
        cy="16.5"
        r="1.7"
        fill="#DDEEF2"
        stroke="#5B737C"
        strokeWidth="0.7"
      />

      {/* Lower chrome rails */}
      <Path
        d="M11 43 H101"
        stroke="#617980"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <Path
        d="M15 47 H102"
        stroke="#F2FAFB"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Exposed wheels */}
      <Circle cx="30" cy="46" r="8" fill="#182C35" />
      <Circle cx="30" cy="46" r="5" fill="#7A8E95" />
      <Circle cx="30" cy="46" r="2.3" fill="#DCECEF" />

      <Circle cx="88" cy="46" r="8" fill="#182C35" />
      <Circle cx="88" cy="46" r="5" fill="#7A8E95" />
      <Circle cx="88" cy="46" r="2.3" fill="#DCECEF" />

      {/* Rounded fenders */}
      <Path
        d="M21 45 Q30 35 39 45"
        fill="none"
        stroke="#6B8188"
        strokeWidth="1.2"
      />
      <Path
        d="M79 45 Q88 35 97 45"
        fill="none"
        stroke="#6B8188"
        strokeWidth="1.2"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF7FF",
    overflow: "hidden",
  },

  decorCircleLarge: {
    position: "absolute",
    width: 310,
    height: 310,
    borderRadius: 155,
    top: -145,
    left: -125,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  decorCircleSmall: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    bottom: -80,
    right: -65,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(125,211,252,0.10)",
  },

  brandBadge: {
    width: 250,
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 15,
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: "#DFF5FF",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#76BBD6",
    shadowOffset: { width: 7, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 9,
  },

  brandHighlight: {
    position: "absolute",
    top: 1,
    left: 22,
    right: 22,
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.8)",
  },

  sheen: {
    position: "absolute",
    top: -35,
    bottom: -35,
    width: 58,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  wordmark: {
    color: "#0F172A",
    fontSize: 46,
    fontWeight: "900",
    letterSpacing: -2.5,
    lineHeight: 52,
    textAlign: "center",
  },

  wordmarkRule: {
    alignSelf: "center",
    width: 48,
    height: 3,
    marginTop: 7,
    borderRadius: 2,
    backgroundColor: "#0EA5E9",
    shadowColor: "#67C8F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },

  brandSubtitle: {
    marginTop: 8,
    color: "#5F7D8D",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2.4,
    textAlign: "center",
  },

  routeSection: {
    width: 190,
    marginTop: 48,
    alignItems: "center",
  },

  routeName: {
    color: "#5F7D8D",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.1,
    textAlign: "center",
  },

  routeTrack: {
    width: 190,
    height: 34,
    marginTop: 10,
    justifyContent: "center",
    overflow: "hidden",
  },

  routeTrackGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(125,211,252,0.16)",
  },

  routeLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: "#A9D8EA",
    shadowColor: "#7DD3FC",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 1,
  },

  routeMarker: {
    position: "absolute",
    left: 0,
    width: 62,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#67B7D8",
    shadowOffset: { width: 3, height: 5 },
    shadowOpacity: 0.26,
    shadowRadius: 8,
    elevation: 5,
  },
});
