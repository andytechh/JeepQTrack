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
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#EEF8FF",
        }}
      >
        <ActivityIndicator size="large" color="#0EA5E9" />

        <Text style={{ marginTop: 16, color: "#94A3B8" }}>Loading...</Text>
      </View>
    );
  }

  if (!user && hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#EEF8FF",
          paddingHorizontal: 20,
        }}
      >
        <Text style={{ textAlign: "center", color: "#94A3B8" }}>
          No user found
        </Text>

        <TouchableOpacity
          style={{
            marginTop: 16,
            borderRadius: 16,
            backgroundColor: "#0EA5E9",
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
          onPress={() => router.replace("/staff/login")}
        >
          <Text style={{ fontWeight: "700", color: "#FFFFFF" }}>
            Go to Login
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
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
  );
}
