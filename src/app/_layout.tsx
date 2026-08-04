import * as Notifications from "expo-notifications";
import { Slot, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import "../../global.css";
import { ThemeProvider, useTheme } from "../src/shared/context/ThemedContext"; // <-- new import
import { AuthService } from "../src/shared/services/AuthService";
import { useAuthStore } from "../src/shared/store/authStore";
import { useChatStore } from "../src/shared/store/chatStore";
import { getAppFlavor } from "../src/shared/utils/flavor";

// ─── NOTIFICATION CHANNEL SETUP ──────────────────────────────────────
const createNotificationChannels = async () => {
  /* ... unchanged ... */
};

Notifications.setNotificationHandler();

// ─── ROOT CONTENT (applies theme class) ─────────────────────────────
function RootContent() {
  const { mode } = useTheme(); // light or dark

  // ─── All your existing hooks and effects remain inside here ─────────
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const segments = useSegments();
  const cleanupRef = useRef<(() => void) | null>(null);
  const { resetUnreadCount } = useChatStore();
  const { user, setUser, isAuthenticated } = useAuthStore();
  const { clearStore } = useChatStore();
  const APP_FLAVOR = getAppFlavor();

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
    // ... unchanged, omitted for brevity
  }, [user?.id]);

  // ─── SEND TEST PUSH ─────────────────────────────────────────────────
  const sendTestPush = async (token: string) => {
    // ... unchanged
  };

  // ─── SETUP NOTIFICATION LISTENERS ─────────────────────────────────
  const setupNotificationListeners = () => {
    // ... unchanged
  };

  // ─── HANDLE NOTIFICATION NAVIGATION ───────────────────────────────
  const handleNotificationNavigation = (data: any) => {
    // ... unchanged
  };

  // ─── GET ROUTE BY ROLE ────────────────────────────────────────────
  const getRouteByRole = (role?: string): string => {
    // ... unchanged
  };

  // ─── NAVIGATION LOGIC ──────────────────────────────────────────────
  useEffect(() => {
    // ... unchanged
  }, [isReady, isAuthenticated, segments, user, showSplash]);

  return (
    <View className={`flex-1 ${mode === "dark" ? "dark" : ""}`}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Slot />
      <Toast />
    </View>
  );
}

// ─── EXPORT WRAPPED WITH THEME PROVIDER ─────────────────────────────
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
