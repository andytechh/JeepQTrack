import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { useAuthStore } from "../../../src/shared/store/authStore";

export default function DispatcherLayout() {
  const { user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (user) {
      setHydrated(true);
      return;
    }

    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.user) {
        setHydrated(true);
      }
    });

    const timer = setTimeout(() => {
      setHydrated(true);
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [user]);

  if (!hydrated && !user) {
    return (
      <View className="flex-1 items-center justify-center bg-clay-background">
        <ActivityIndicator size="large" color="#0EA5E9" />

        <Text className="mt-4 text-ink-muted">Loading...</Text>
      </View>
    );
  }

  if (!user && hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-clay-background px-5">
        <Text className="text-center text-ink-muted">No user found</Text>

        <TouchableOpacity
          className="mt-4 rounded-[16px] bg-ocean-500 px-6 py-3"
          onPress={() => router.replace("/staff/login")}
        >
          <Text className="font-bold text-white">Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-clay-background">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </View>
  );
}
