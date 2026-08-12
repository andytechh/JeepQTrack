// app/staff/(dispatcher)/_layout.tsx
import { router, Stack } from "expo-router";
import { LogOut, User } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
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
  const { user, logout } = useAuthStore();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Wait for store to hydrate
  useEffect(() => {
    if (user) {
      setHydrated(true);
      return;
    }
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.user) setHydrated(true);
    });
    const timer = setTimeout(() => {
      if (!hydrated) {
        console.log("⚠️ Auth hydration timeout, forcing render");
        setHydrated(true);
      }
    }, 3000);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // ─── FETCH NOTIFICATIONS ──────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setLoadingNotifications(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.uid)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user?.uid]);

  const fetchNotificationCount = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const count = await NotificationService.getUnreadCount(user.uid);
      setNotificationCount(count);
    } catch (error) {
      console.log("Notification count error:", error);
    }
  }, [user?.uid]);

  // ─── SUBSCRIPTION ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    fetchNotificationCount();

    const channel = supabase
      .channel(`disp_notif_${user.uid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.uid}`,
        },
        () => {
          fetchNotificationCount();
          if (showNotifications) fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [
    user?.uid,
    fetchNotificationCount,
    fetchNotifications,
    showNotifications,
  ]);

  // ─── MARK AS READ ──────────────────────────────────────────────────
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      // Decrement count
      setNotificationCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user?.uid)
        .eq("read", false);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setNotificationCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, [user?.uid]);

  // ─── OPEN NOTIFICATIONS MODAL ─────────────────────────────────────
  const handleOpenNotifications = useCallback(() => {
    setShowNotifications(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // ─── RENDER ──────────────────────────────────────────────────────
  if (!hydrated && !user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a1628]">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="text-white/60 mt-4">Loading...</Text>
      </View>
    );
  }

  if (!user && hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a1628] p-4">
        <Text className="text-white/60 text-center">No user found</Text>
        <TouchableOpacity
          className="mt-4 bg-sky-500 px-6 py-2.5 rounded-xl"
          onPress={() => router.replace("/staff/login")}
        >
          <Text className="text-white font-medium">Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a1628]">
      <ModernHeader
        avatarText={user?.displayName || "Dispatcher"}
        notificationCount={notificationCount}
        onNotificationPress={handleOpenNotifications}
        onAvatarPress={() => setShowProfileMenu(true)}
      />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>

      {/* ─── NOTIFICATIONS MODAL ──────────────────────────────────── */}
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
              <View className="flex-row items-center gap-3">
                {notificationCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead}>
                    <Text className="text-sky-400 text-sm">Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotifications(false)}>
                  <Text className="text-sky-400">Close</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loadingNotifications ? (
              <ActivityIndicator
                size="large"
                color="#0ea5e9"
                className="mt-8"
              />
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <Text className="text-gray-500 text-center py-8">
                    No notifications
                  </Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className={`p-3 rounded-xl mb-2 ${item.read ? "bg-white/5" : "bg-sky-500/20 border border-sky-500/30"}`}
                    onPress={() => markNotificationAsRead(item.id)}
                  >
                    <Text className="text-white font-semibold">
                      {item.title}
                    </Text>
                    <Text className="text-gray-400 text-sm">
                      {item.message}
                    </Text>
                    <Text className="text-gray-500 text-[10px] mt-1">
                      {new Date(item.created_at).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ─── PROFILE MODAL ────────────────────────────────────────── */}
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
