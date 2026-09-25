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
import { AuthService } from "../src/shared/services/AuthService";
import { useAuthStore } from "../src/shared/store/authStore";
import { useChatStore } from "../src/shared/store/chatStore";
import { getAppFlavor, isStaffApp } from "../src/shared/utils/flavor";

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
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const segments = useSegments();
  const cleanupRef = useRef<(() => void) | null>(null);
  const { resetUnreadCount } = useChatStore();
  const { user, setUser, isAuthenticated } = useAuthStore();
  const { clearStore } = useChatStore();
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

  // ─── ACTIVATE THE AUTH STORE'S OWN LISTENER ───────────────────────
  // This is the single, authoritative source for auth state changes —
  // it listens directly to Supabase's onAuthStateChange stream, so
  // `isAuthenticated`/`user` in the store are always driven by real
  // SIGNED_IN / SIGNED_OUT events rather than manual polling. Without
  // this activated, nothing in the app was subscribed to Supabase's
  // real auth events at all.
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initializeAuthListener();
    return () => {
      unsubscribe?.();
    };
  }, []);

  // ─── CHECK AUTH ON APP START (ONCE) ───────────────────────────────
  // IMPORTANT: this must run exactly once, on mount — NOT whenever
  // `user` changes. It previously depended on [user, setUser], which
  // meant it re-ran every time logout() set user to null. That re-run
  // immediately called AuthService.getCurrentUser() again, which could
  // race against logout()'s own in-flight supabase.auth.signOut() call
  // and read a session that hadn't been invalidated yet — silently
  // calling setUser(currentUser) right after logout() had just cleared
  // it. That race is what caused the dashboard to reappear after
  // repeated login/logout cycles instead of staying on the login
  // screen. Auth state changes after the initial check are now handled
  // exclusively by the listener above and by direct store calls
  // (login screen's setUser, profile screen's logout).
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const storeUser = useAuthStore.getState().user;

        if (storeUser) {
          console.log("✅ User found in store:", storeUser.email);
          if (mounted) {
            setIsReady(true);
          }
          return;
        }

        resetUnreadCount();

        const currentUser = await AuthService.getCurrentUser();

        if (!mounted) return;

        if (currentUser) {
          console.log("✅ User found in Supabase:", currentUser.email);
          setUser(currentUser);
        } else {
          console.log("❌ No user found");
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []); // ← run once, not on every `user` change

  // ─── REGISTER PUSH TOKEN WHEN USER LOGS IN ────────────────────────
  useEffect(() => {
    if (user?.uid && isReady) {
      registerPushToken();
    }
  }, [user?.id, isReady]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    if (user?.id && isReady) {
      const cleanup = setupNotificationListeners();
      cleanupRef.current = cleanup;

      return () => {
        cleanup?.();
        cleanupRef.current = null;
      };
    }
  }, [user?.id, isReady]);

  useEffect(() => {
    clearStore();
  }, []);

  // ─── REGISTER PUSH TOKEN ───────────────────────────────────────────
  const registerPushToken = useCallback(async () => {
    try {
      console.log("🔔 Registering push token...");

      if (!Constants.isDevice) {
        console.log("⚠️ Push notifications only work on physical devices");
        return;
      }

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

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      console.log("✅ Expo Push Token:", token.data);

      let saveSuccess = false;
      let retries = 0;
      const maxRetries = 3;

      while (!saveSuccess && retries < maxRetries) {
        try {
          const { error } = await supabase
            .from("users")
            .update({ expo_push_token: token.data })
            .eq("id", user?.id);

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
  }, [user?.id]);

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
