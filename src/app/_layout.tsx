import { Slot, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import "../../global.css";
import { AuthService } from "../src/shared/services/AuthService";
import { useAuthStore } from "../src/shared/store/authStore";
import { getAppFlavor, isStaffApp } from "../src/shared/utils/flavor";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const segments = useSegments();

  const { user, setUser, isAuthenticated } = useAuthStore();
  const APP_FLAVOR = getAppFlavor();

  // Check auth on app start
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First check if we have a user in the store (from persistence)
      if (user) {
        console.log("✅ User found in store:", user.email);
        setIsReady(true);
        // Hide splash after a moment
        setTimeout(() => setShowSplash(false), 1500);
        return;
      }

      // If no user in store, try to get from Supabase
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        console.log("✅ User found in Supabase:", currentUser.email);
        setUser(currentUser);
      } else {
        console.log("❌ No user found");
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
    } finally {
      setIsReady(true);
      // Hide splash after a minimum display time
      setTimeout(() => {
        setShowSplash(false);
      }, 2000);
    }
  };

  // Navigation logic
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
      router.replace(route as any);
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
      router.replace(route as any);
      return;
    }

    // If user is authenticated and on the root path, redirect to staff
    if (isAuthenticated && segments.length === 0) {
      const route = getRouteByRole(user?.role);
      console.log(`✅ Authenticated on root, redirecting to: ${route}`);
      router.replace(route as any);
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
