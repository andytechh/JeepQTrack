import "dotenv/config";

const variant =
  process.env.APP_VARIANT || process.env.EXPO_PUBLIC_APP_FLAVOR || "commuter";
const isStaff = variant === "staff";

export default {
  expo: {
    name: isStaff ? "SmartQs Staff" : "SmartQs",

    slug: "JeepQTrack",

    version: "1.0.1",

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
          backgroundColor: "#171A1C",
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
        projectId: "59e56dea-8e12-4f2e-ba74-cb0b92e84592",
      },
    },

    owner: "andevs",

    runtimeVersion: {
      policy: "appVersion",
    },

    updates: {
      url: "https://u.expo.dev/59e56dea-8e12-4f2e-ba74-cb0b92e84592",
    },
  },
};
