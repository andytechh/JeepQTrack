import { Slot, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import "../../global.css";
import { AuthService } from "../src/shared/services/AuthService";
import { useAuthStore } from "../src/shared/store/authStore";
import { ThemeProvider, useAppTheme } from "../src/shared/theme/ThemeProvider";
import { isStaffApp } from "../src/shared/utils/flavor";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { colors, isDark } = useAppTheme();
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();

  const { user, setUser, isAuthenticated, isGuest } = useAuthStore();

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      if (user) {
        setIsReady(true);
        return;
      }
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser ?? null);
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
    } finally {
      setIsReady(true);
    }
  };

  // ─── Routing ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return;

    const root = segments[0];

    // ── Commuter flavor: guests are allowed everywhere except login ──
    if (!isStaffApp()) {
      const inCommuter = root === "commuter";
      const inCommuterLogin = inCommuter && segments[1] === "login";
      const hasAccess = isAuthenticated || isGuest;

      if (hasAccess && inCommuterLogin) {
        router.replace("/commuter");
        return;
      }
      if (!hasAccess && inCommuter && !inCommuterLogin) {
        router.replace("/commuter/login");
        return;
      }
      if (segments.length === 0) {
        router.replace(hasAccess ? "/commuter" : "/commuter/login");
      }
      return;
    }

    // ── Staff flavor ──
    const inStaff = root === "staff";
    const inLogin = inStaff && segments[1] === "login";

    if (isAuthenticated && inLogin) {
      router.replace(getRouteByRole(user?.role) as any);
      return;
    }
    if (!isAuthenticated && inStaff && !inLogin) {
      router.replace("/staff/login");
      return;
    }
    if (isAuthenticated && inStaff && !segments[1]) {
      router.replace(getRouteByRole(user?.role) as any);
      return;
    }
    if (segments.length === 0) {
      router.replace(
        isAuthenticated ? (getRouteByRole(user?.role) as any) : "/staff/login",
      );
    }
  }, [isReady, isAuthenticated, isGuest, segments, user]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Slot />
      <Toast />
    </View>
  );
}

function getRouteByRole(role?: string): string {
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
}
