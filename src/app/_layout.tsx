import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Slot, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import "../../global.css";
import { supabase } from "../src/shared/config/supabase";
import { useGlobalChatListener } from "../src/shared/hooks/useGlobalChatListener";
import { AuthService } from "../src/shared/services/AuthService";
import { useAuthStore } from "../src/shared/store/authStore";
import { useChatStore } from "../src/shared/store/chatStore";
import { getAppFlavor, isStaffApp } from "../src/shared/utils/flavor";

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

  // ─── INITIALIZE NOTIFICATION CHANNELS ──────────────────────────────
  useEffect(() => {
    createNotificationChannels();
  }, []);

  // ─── CHECK AUTH ON APP START ──────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // First check if we have a user in the store (from persistence)
        if (user) {
          console.log("✅ User found in store:", user.email);
          if (mounted) {
            setIsReady(true);
            setTimeout(() => {
              if (mounted) setShowSplash(false);
            }, 1500);
          }
          return;
        }
        resetUnreadCount();
        // If no user in store, try to get from Supabase
        const currentUser = await AuthService.getCurrentUser();
        if (currentUser) {
          console.log("✅ User found in Supabase:", currentUser.email);
          if (mounted) setUser(currentUser);
        } else {
          console.log("❌ No user found");
          if (mounted) setUser(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) {
          setIsReady(true);
          setTimeout(() => {
            if (mounted) setShowSplash(false);
          }, 2000);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [user, setUser]);

  // ─── REGISTER PUSH TOKEN WHEN USER LOGS IN ────────────────────────
  useEffect(() => {
    if (user?.id && isReady) {
      registerPushToken();
    }
  }, [user?.id, isReady]);

  // ─── SETUP NOTIFICATION LISTENERS ─────────────────────────────────
  useEffect(() => {
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
  }, [user?.id]);

  // ─── SEND TEST PUSH ─────────────────────────────────────────────────
  const sendTestPush = async (token: string) => {
    try {
      console.log("📤 Sending test push...");

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: token,
          title: "🧪 Push Notification Test",
          body: "Push notifications are working! 🎉",
          sound: "default",
          priority: "high",
          data: { type: "test" },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Test push sent successfully!");
      } else {
        console.log("❌ Test push failed:", result);
      }
    } catch (error) {
      console.error("❌ Error sending test push:", error);
    }
  };

  // ─── SETUP NOTIFICATION LISTENERS ─────────────────────────────────
  const setupNotificationListeners = () => {
    // When notification is received in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("📱 Foreground notification received:", {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data,
        });

        // Show toast for foreground notifications
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

    // When user taps notification
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 User tapped notification:", {
          actionIdentifier: response.actionIdentifier,
          data: response.notification.request.content.data,
        });

        const data = response.notification.request.content.data;

        // Dismiss the notification when tapped
        Notifications.dismissNotificationAsync(
          response.notification.request.identifier,
        ).catch((err) => {
          console.error("Failed to dismiss notification:", err);
        });

        // Navigate based on notification type
        handleNotificationNavigation(data);
      });

    // Return cleanup function
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
    // Don't navigate while splash is showing or not ready
    if (!isReady || showSplash) return;

    // Only handle staff app routing
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

    // If user is authenticated and trying to access login, redirect to dashboard
    if (isAuthenticated && inLogin) {
      const route = getRouteByRole(user?.role);
      console.log(`✅ Authenticated, redirecting to: ${route}`);
      router.replace(route);
      return;
    }

    // If user is NOT authenticated and trying to access staff routes (except login), redirect to login
    if (!isAuthenticated && inStaff && !inLogin) {
      console.log("🔒 Not authenticated, redirecting to login");
      router.replace("/staff/login");
      return;
    }

    // If user is authenticated and on staff root, redirect to their dashboard
    if (isAuthenticated && segments[0] === "staff" && !segments[1]) {
      const route = getRouteByRole(user?.role);
      console.log(`✅ Authenticated on staff root, redirecting to: ${route}`);
      router.replace(route);
      return;
    }

    // If user is authenticated and on the root path, redirect to staff
    if (isAuthenticated && segments.length === 0) {
      const route = getRouteByRole(user?.role);
      console.log(`✅ Authenticated on root, redirecting to: ${route}`);
      router.replace(route);
      return;
    }

    // If user is NOT authenticated and on root, redirect to staff login
    if (!isAuthenticated && segments.length === 0) {
      console.log("🔒 Not authenticated on root, redirecting to login");
      router.replace("/staff/login");
      return;
    }
  }, [isReady, isAuthenticated, segments, user, showSplash]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Slot />
      <Toast />
    </SafeAreaProvider>
  );
}
