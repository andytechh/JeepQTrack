import "dotenv/config";

const variant =
  process.env.APP_VARIANT || process.env.EXPO_PUBLIC_APP_FLAVOR || "commuter";
const isStaff = variant === "staff";

export default {
  expo: {
    name: isStaff ? "SmartQs Staff" : "SmartQs",

    slug: "JeepQTrack",

    version: "1.0.2",

    orientation: "portrait",

    icon: "./assets/images/logo.png",

    scheme: isStaff ? "smartqs-staff" : "smartqs",

    userInterfaceStyle: "automatic",

    ios: {
      icon: "./assets/expo.icon",
      bundleIdentifier: isStaff
        ? "com.andevs.JeepQTrackStaff"
        : "com.andevs.JeepQTrack",
    },

    android: {
      adaptiveIcon: {
        backgroundColor: "#EAF7FF",
        foregroundImage: "./assets/images/logo.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },

      predictiveBackGestureEnabled: false,

      googleServicesFile: isStaff
        ? "./google-services-staff.json"
        : "./google-services.json",

      package: isStaff ? "com.andevs.JeepQTrackStaff" : "com.andevs.JeepQTrack",

      permissions: ["android.permission.POST_NOTIFICATIONS"],
    },

    web: {
      output: "static",
      favicon: "./assets/images/logo.png",
      bundler: "metro",
    },

    plugins: [
      "expo-router",
      "@react-native-vector-icons/ionicons",
      "expo-sharing",
      [
        "expo-notifications",
        {
          sounds: ["./assets/sounds/chat.wav"],
        },
      ],

      [
        "expo-splash-screen",
        {
          image: "./assets/images/logo.png",
          backgroundColor: "#171A1C",
          imageWidth: 200,
        },
      ],

      "expo-secure-store",
      "expo-web-browser",

      [
        "expo-navigation-bar",
        {
          hidden: true,
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      router: {},

      appVariant: variant,

      eas: {
        projectId: "ccba8ad7-76dd-4897-819a-a109dc800d7d",
      },
    },

    owner: "andytechhy",

    runtimeVersion: {
      policy: "appVersion",
    },

    updates: {
      url: "https://u.expo.dev/ccba8ad7-76dd-4897-819a-a109dc800d7d",
    },
  },
};
