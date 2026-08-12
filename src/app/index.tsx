// app/index.tsx
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuthStore } from "../src/shared/store/authStore";
import { getAppFlavor } from "../src/shared/utils/flavor";

export default function Index() {
  const { user, isLoading } = useAuthStore();
  const APP_FLAVOR = getAppFlavor();

  useEffect(() => {
    if (!isLoading) {
      if (APP_FLAVOR === "staff") {
        // 🔥 Check user role to determine correct tab group
        if (user) {
          const role = user.role;
          if (role === "driver") {
            router.replace("/staff/(driver)");
          } else if (role === "dispatcher") {
            router.replace("/staff/(dispatcher)");
          } else if (role === "admin") {
            router.replace("/staff/(admin)");
          } else {
            router.replace("/staff/login");
          }
        } else {
          router.replace("/staff/login");
        }
      } else {
        router.replace("/commuter");
      }
    }
  }, [isLoading, user]);

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-slate-900">
      <View className="w-16 h-16 rounded-full bg-primary-500 items-center justify-center mb-4" />
      <ActivityIndicator size="large" color="#208AEF" />
      <Text className="mt-4 text-gray-500 font-medium">Loading JeepQss...</Text>
    </View>
  );
}
