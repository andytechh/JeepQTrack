// app/index.tsx
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { useAuthStore } from "../src/shared/store/authStore";
import { getAppFlavor } from "../src/shared/utils/flavor";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const APP_FLAVOR = getAppFlavor();

  useEffect(() => {
    if (!isLoading) {
      if (APP_FLAVOR === "staff") {
        if (isAuthenticated) {
          router.replace("/staff/(driver)");
        } else {
          router.replace("/staff/login");
        }
      } else {
        router.replace("/commuter");
      }
    }
  }, [isLoading, isAuthenticated]);

  // Show loading while checking auth
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <View className="w-16 h-16 rounded-full bg-primary-500 items-center justify-center mb-4">
        <Text className="text-white text-3xl">🚐</Text>
      </View>
      <ActivityIndicator size="large" color="#208AEF" />
      <Text className="mt-4 text-gray-500 font-medium">Loading JeepQss...</Text>
    </View>
  );
}
