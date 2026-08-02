import { router, Stack } from "expo-router";
import { LogOut, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ModernHeader } from "../../../src/shared/components/ui/ModernHeader";
import { supabase } from "../../../src/shared/config/supabase";
import { AuthService } from "../../../src/shared/services/AuthService";
import { NotificationService } from "../../../src/shared/services/NotificationService";
import { useAuthStore } from "../../../src/shared/store/authStore";

export default function DispatcherLayout() {
  const { user, isLoading, logout } = useAuthStore();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const fetchNotificationCount = async () => {
    if (!user?.uid) return;
    try {
      const count = await NotificationService.getUnreadCount(user.uid);
      setNotificationCount(count);
    } catch (error) {}
  };

  useEffect(() => {
    if (!user?.uid) return;
    fetchNotificationCount();
    const channel = supabase
      .channel(`disp_${user.uid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.uid}`,
        },
        () => fetchNotificationCount(),
      )
      .subscribe();
    return () => {
      channel?.unsubscribe();
    };
  }, [user?.uid]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a1628]">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a1628]">
      {/* Header */}
      <ModernHeader
        avatarText={user?.displayName || "Dispatcher"}
        notificationCount={notificationCount}
        onNotificationPress={() => setShowNotifications(true)}
        onAvatarPress={() => setShowProfileMenu(true)}
      />

      {/* ✅ This Stack wraps the (tabs) group */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNotifications(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-[#0f172a] rounded-t-3xl max-h-[75%] min-h-[40%] p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-bold">
                Notifications
              </Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Text className="text-sky-400">Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text className="text-gray-500 text-center py-8">
                  No notifications
                </Text>
              }
              renderItem={({ item }) => (
                <View className="p-3 bg-white/5 rounded-xl mb-2">
                  <Text className="text-white font-semibold">{item.title}</Text>
                  <Text className="text-gray-400 text-sm">{item.message}</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View className="absolute top-16 right-4 bg-[#0f172a] rounded-2xl w-64 overflow-hidden border border-[#1e293b]">
            <View className="p-4 border-b border-[#1e293b]">
              <Text className="text-white font-semibold">
                {user?.displayName || "Dispatcher"}
              </Text>
              <Text className="text-gray-400 text-xs">{user?.role}</Text>
            </View>
            <TouchableOpacity
              className="flex-row items-center gap-3 p-4 border-b border-[#1e293b]"
              onPress={() => {
                setShowProfileMenu(false);
                router.push("/staff/(dispatcher)/(tabs)/settings");
              }}
            >
              <User size={20} color="#94a3b8" />
              <Text className="text-gray-300">Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center gap-3 p-4"
              onPress={() => {
                Alert.alert("Logout", "Are you sure?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                      await AuthService.signOut();
                      logout();
                      router.replace("/staff/login");
                    },
                  },
                ]);
              }}
            >
              <LogOut size={20} color="#ef4444" />
              <Text className="text-red-400">Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
