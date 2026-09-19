import { router, Stack } from "expo-router";
import { HelpCircle, LogOut, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuthStore } from "../../../src/shared/store/authStore";

export default function DispatcherLayout() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const initializeAuthListener = useAuthStore(
    (state) => state.initializeAuthListener,
  );

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const cleanup = initializeAuthListener();

    return cleanup;
  }, [initializeAuthListener]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowProfileMenu(false);
      router.replace("/staff/login");
    }
  }, [isLoading, isAuthenticated]);

  const handleLogout = () => {
    if (loggingOut) {
      return;
    }

    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          if (loggingOut) {
            return;
          }

          setLoggingOut(true);
          setShowProfileMenu(false);

          try {
            await logout();
          } finally {
            setLoggingOut(false);
            router.replace("/staff/login");
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a1628]">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a1628]">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a1628]">
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notifications" />
      </Stack>

      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loggingOut) {
            setShowProfileMenu(false);
          }
        }}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => {
            if (!loggingOut) {
              setShowProfileMenu(false);
            }
          }}
        >
          <View className="absolute right-4 top-16 w-64 overflow-hidden rounded-2xl border border-[#1e293b] bg-[#0f172a] shadow-2xl">
            <View className="border-b border-[#1e293b] bg-[#0ea5e9]/5 p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-[#0ea5e9]">
                  <Text className="text-lg font-bold text-white">
                    {user.displayName?.charAt(0)?.toUpperCase() || "D"}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text
                    className="text-base font-semibold text-white"
                    numberOfLines={1}
                  >
                    {user.displayName || "Dispatcher"}
                  </Text>

                  <Text
                    className="mt-1 text-xs text-gray-400"
                    numberOfLines={1}
                  >
                    {user.role || "Dispatcher"}
                  </Text>

                  {user.email ? (
                    <Text
                      className="mt-0.5 text-xs text-gray-500"
                      numberOfLines={1}
                    >
                      {user.email}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            <ScrollView>
              <TouchableOpacity
                disabled={loggingOut}
                className="flex-row items-center gap-3 border-b border-[#1e293b] p-4"
                activeOpacity={0.7}
                onPress={() => {
                  setShowProfileMenu(false);
                  router.push("/staff/(dispatcher)/(tabs)/profile");
                }}
              >
                <User size={20} color="#94a3b8" />

                <Text className="text-base text-gray-300">
                  Profile Settings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={loggingOut}
                className="flex-row items-center gap-3 border-b border-[#1e293b] p-4"
                activeOpacity={0.7}
                onPress={() => {
                  setShowProfileMenu(false);

                  Alert.alert("Help", "Contact support at support@jeepqss.com");
                }}
              >
                <HelpCircle size={20} color="#94a3b8" />

                <Text className="text-base text-gray-300">Help & Support</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={loggingOut}
                className="flex-row items-center gap-3 p-4"
                activeOpacity={0.7}
                onPress={handleLogout}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <LogOut size={20} color="#ef4444" />
                )}

                <Text className="text-base font-medium text-red-400">
                  {loggingOut ? "Logging out..." : "Logout"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
