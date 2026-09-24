import Constants from "expo-constants";
import { NavigationBar } from "expo-navigation-bar";
import * as Notifications from "expo-notifications";
import { Slot, router, useSegments } from "expo-router";
import * as NativeSplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import "../../global.css";
import SUSFeedbackPrompt from "../src/shared/components/feedback/SUSFeedbackPrompt";
import ConnectivityStatus from "../src/shared/components/ui/ConnectivityStatus";
import JeepQLaunchSplash from "../src/shared/components/ui/splashscreen";
import { supabase } from "../src/shared/config/supabase";
import { ThemeProvider as AppThemeProvider } from "../src/shared/context/ThemeContext";
import { useGlobalChatListener } from "../src/shared/hooks/useGlobalChatListener";
import { useAuthStore } from "../src/shared/store/authStore";
import { useChatStore } from "../src/shared/store/chatStore";
import { getAppFlavor, isStaffApp } from "../src/shared/utils/flavor";

// Keep the native splash up until the animated JeepQ launch screen is mounted.
NativeSplashScreen.preventAutoHideAsync().catch(() => {
  // It may already be hidden during Fast Refresh.
});
NativeSplashScreen.setOptions({ duration: 300, fade: true });

// ─── NOTIFICATION CHANNEL SETUP ──────────────────────────────────────
const createNotificationChannels = async () => {
  if (Platform.OS !== "android") return;

  try {
    await Notifications.setNotificationChannelAsync("jeepq_default", {
      name: "JeepQ Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync("arrival", {
      name: "Jeepney Arrivals",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync("dispatch", {
      name: "Jeepney Dispatches",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync("chat", {
      name: "Messages",
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      showBadge: true,
    });

    console.log("✅ Notification channels created");
  } catch (error) {
    console.error("❌ Failed to create notification channels:", error);
  }
};

Notifications.setNotificationHandler({
  handleNotification: async () => {
    const isForeground = AppState.currentState === "active";

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: isForeground,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const segments = useSegments();
  const cleanupRef = useRef<(() => void) | null>(null);
  const resetUnreadOnceRef = useRef(false);

  const { resetUnreadCount, clearStore } = useChatStore();
  const { user, isAuthenticated, isLoading, initializeAuthListener } =
    useAuthStore();

  // isReady mirrors the store's own loading state instead of a second,
  // independently-computed boot flag.
  const isReady = !isLoading;

  const APP_FLAVOR = getAppFlavor();
  useGlobalChatListener();

  useEffect(() => {
    // The launch overlay mounts on the first React render, avoiding a blank
    // frame between the native splash and the animated wordmark.
    const frame = requestAnimationFrame(() => NativeSplashScreen.hide());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      createNotificationChannels();
    }
  }, []);

  // ─── ANDROID NAVIGATION BAR (hide; OS handles swipe-to-reveal) ────
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setHidden(true);
  }, []);

  // ─── AUTH: single source of truth is the store ────────────────────
  // authStore.hydrate() already runs automatically via onRehydrateStorage,
  // and getSession()/profile-fetch errors are handled inside it. All this
  // layout needs to do is subscribe to future auth changes.
  useEffect(() => {
    const unsubscribe = initializeAuthListener();
    return unsubscribe;
  }, [initializeAuthListener]);

  // Preserve the original "clear unread badge if nobody's logged in" intent,
  // but fire it once, off the store's own settled state, instead of running
  // a second parallel Supabase check.
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !resetUnreadOnceRef.current) {
      resetUnreadOnceRef.current = true;
      resetUnreadCount();
    }
  }, [isLoading, isAuthenticated, resetUnreadCount]);

  // ─── REGISTER PUSH TOKEN WHEN USER LOGS IN ────────────────────────
  useEffect(() => {
    if (user?.uid && isReady) {
      registerPushToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isReady]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    if (user?.uid && isReady) {
      const cleanup = setupNotificationListeners();
      cleanupRef.current = cleanup;

      return () => {
        cleanup?.();
        cleanupRef.current = null;
      };
    }
  }, [user?.uid, isReady]);

  useEffect(() => {
    clearStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── REGISTER PUSH TOKEN ───────────────────────────────────────────
  const registerPushToken = useCallback(async () => {
    try {
      console.log("🔔 Registering push token...");

      // 1. Check if physical device
      if (!Constants.isDevice) {
        console.log("⚠️ Push notifications only work on physical devices");
        return;
      }

      // 2. Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("❌ Push notification permission denied");
        Toast.show({
          type: "error",
          text1: "Permission Denied",
          text2: "Please enable notifications in settings",
          position: "top",
          visibilityTime: 4000,
        });
        return;
      }

      // 3. Get Project ID
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        console.log("❌ No EAS project ID found. Run `eas init` first.");
        Toast.show({
          type: "error",
          text1: "Configuration Error",
          text2: "Missing project configuration",
          position: "top",
          visibilityTime: 4000,
        });
        return;
      }

      console.log("📋 Project ID:", projectId);

      // 4. Get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      console.log("✅ Expo Push Token:", token.data);

      // 5. Save to Supabase with retry logic
      let saveSuccess = false;
      let retries = 0;
      const maxRetries = 3;

      while (!saveSuccess && retries < maxRetries) {
        try {
          const { error } = await supabase
            .from("users")
            .update({ expo_push_token: token.data })
            .eq("id", user?.uid);

          if (error) {
            throw error;
          }

          saveSuccess = true;
          console.log("✅ Push token saved to Supabase");
        } catch (error) {
          retries++;
          console.error(
            `❌ Failed to save push token (attempt ${retries}/${maxRetries}):`,
            error,
          );

          if (retries < maxRetries) {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, retries) * 1000),
            );
          }
        }
      }

      if (!saveSuccess) {
        Toast.show({
          type: "error",
          text1: "Sync Failed",
          text2: "Could not save push token. Please try again later.",
          position: "top",
          visibilityTime: 4000,
        });
        return;
      }

      // 6. Send test push only in development
      if (__DEV__) {
        await sendTestPush(token.data);
      }
    } catch (error) {
      console.error("❌ Error registering push token:", error);
      Toast.show({
        type: "error",
        text1: "Setup Failed",
        text2: "Could not configure push notifications",
        position: "top",
        visibilityTime: 4000,
      });
    }
  }, [user?.uid]);

  // ─── SETUP NOTIFICATION LISTENERS ─────────────────────────────────
  const setupNotificationListeners = () => {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("📱 Foreground notification received:", {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data,
        });

        if (notification.request.content.title) {
          Toast.show({
            type: "info",
            text1: notification.request.content.title,
            text2: notification.request.content.body || "",
            position: "top",
            visibilityTime: 5000,
          });
        }
      },
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 User tapped notification:", {
          actionIdentifier: response.actionIdentifier,
          data: response.notification.request.content.data,
        });

        const data = response.notification.request.content.data;

        Notifications.dismissNotificationAsync(
          response.notification.request.identifier,
        ).catch((err) => {
          console.error("Failed to dismiss notification:", err);
        });

        handleNotificationNavigation(data);
      });

    return () => {
      try {
        notificationListener.remove();
      } catch (error) {
        console.error("Error removing notification listener:", error);
      }
      try {
        responseListener.remove();
      } catch (error) {
        console.error("Error removing response listener:", error);
      }
    };
  };

  // ─── HANDLE NOTIFICATION NAVIGATION ───────────────────────────────
  const handleNotificationNavigation = (data: any) => {
    try {
      if (data?.type === "arrival" || data?.type === "arrived_at_terminal") {
        router.push("/staff/(driver)/queue");
      } else if (data?.type === "dispatch" || data?.type === "eta") {
        router.push("/staff/(driver)/gps-tracking");
      } else if (data?.type === "occupancy") {
        router.push("/staff/(driver)/index");
      } else if (data?.type === "queue") {
        router.push("/staff/(driver)/queue");
      } else if (data?.type === "chat") {
        router.push("/staff/chat");
      } else {
        router.push("/staff/notifications");
      }
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  // ─── GET ROUTE BY ROLE ────────────────────────────────────────────
  const getRouteByRole = (role?: string): string => {
    switch (role) {
      case "driver":
        return "/staff/(driver)";
      case "dispatcher":
        return "/staff/(dispatcher)";
      case "admin":
        return "/staff/(admin)";
      default:
        return "/staff/login";
    }
  };

  // ─── NAVIGATION LOGIC ──────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || showSplash) return;
    if (!isStaffApp()) return;

    const inLogin = segments[0] === "staff" && segments[1] === "login";
    const inStaff = segments[0] === "staff";

    console.log(`📍 Navigation check:`, {
      isAuthenticated,
      inLogin,
      inStaff,
      segments,
      role: user?.role,
    });

    if (isAuthenticated && inLogin) {
      const route = getRouteByRole(user?.role);
      console.log(`✅ Authenticated, redirecting to: ${route}`);
      router.replace(route);
      return;
    }

    if (!isAuthenticated && inStaff && !inLogin) {
      console.log("🔒 Not authenticated, redirecting to login");
      router.replace("/staff/login");
      return;
    }

    if (isAuthenticated && segments[0] === "staff" && !segments[1]) {
      const route = getRouteByRole(user?.role);
      console.log(`✅ Authenticated on staff root, redirecting to: ${route}`);
      router.replace(route);
      return;
    }

    if (isAuthenticated && segments.length === 0) {
      const route = getRouteByRole(user?.role);
      console.log(`✅ Authenticated on root, redirecting to: ${route}`);
      router.replace(route);
      return;
    }

    if (!isAuthenticated && segments.length === 0) {
      console.log("🔒 Not authenticated on root, redirecting to login");
      router.replace("/staff/login");
      return;
    }
  }, [isReady, isAuthenticated, segments, user, showSplash]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />

      <AppThemeProvider>
        <Slot />

        <Toast />

        <ConnectivityStatus />

        <SUSFeedbackPrompt
          userId={user?.uid}
          role={user?.role}
          enabled={isAuthenticated && isReady && !showSplash}
        />

        {showSplash ? (
          <JeepQLaunchSplash
            isAppReady={isReady}
            onComplete={() => setShowSplash(false)}
          />
        ) : null}
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
