// app/staff/(driver)/_layout.tsx
import { router, Stack } from "expo-router";
import { Bell, HelpCircle, LogOut, User } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ModernHeader } from "../../../src/shared/components/ui/ModernHeader";
import { supabase } from "../../../src/shared/config/supabase";
import { AuthService } from "../../../src/shared/services/AuthService";
import { NotificationService } from "../../../src/shared/services/NotificationService";
import { useAuthStore } from "../../../src/shared/store/authStore";

// ─── Types ──────────────────────────────────────────────────────────
interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  type?: string;
}

// ─── Main Component ──────────────────────────────────────────────────
export default function DriverLayout() {
  const { user, isLoading, logout } = useAuthStore();

  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isFetchingNotifications, setIsFetchingNotifications] = useState(false);
  const channelRef = useRef<any>(null);

  // ─── Notification Functions ──────────────────────────────────────

  const fetchNotificationCount = async () => {
    if (!user?.uid) return;
    try {
      const count = await NotificationService.getUnreadCount(user.uid);
      setNotificationCount(count);
    } catch (error) {
      console.log("📢 Notifications not ready yet");
    }
  };

  const fetchNotifications = async () => {
    if (!user?.uid || isFetchingNotifications) return;
    setIsFetchingNotifications(true);
    try {
      const data = await NotificationService.getNotifications(user.uid);
      setNotifications(data as Notification[]);
    } catch (error) {
      console.log("📢 Notifications not ready yet");
    } finally {
      setIsFetchingNotifications(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      const unreadCount = notifications.filter(
        (n) => !n.read && n.id !== id,
      ).length;
      setNotificationCount(unreadCount);
    } catch (error) {
      console.error("❌ Mark read error:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      for (const id of unreadIds) {
        await NotificationService.markAsRead(id);
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setNotificationCount(0);
    } catch (error) {
      console.error("❌ Mark all read error:", error);
    }
  };

  // ─── Profile Menu ─────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AuthService.signOut();
            logout();
            router.replace("/staff/login");
          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
  };

  // ─── Real-time Subscriptions ─────────────────────────────────────

  useEffect(() => {
    if (isLoading || !user?.uid) return;
    fetchNotificationCount();

    const setupSubscription = async () => {
      try {
        const { error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .limit(1);

        if (error) return;

        if (channelRef.current) {
          channelRef.current.unsubscribe();
          channelRef.current = null;
        }

        const channel = supabase.channel(`notifications_${user.uid}`).on(
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
        );

        channelRef.current = channel;
        channel.subscribe((status) => {
          console.log("📡 Notification subscription:", status);
        });
      } catch (error) {
        console.log("📢 Notifications not available");
      }
    };

    setupSubscription();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [user?.uid, isLoading, showNotifications]);

  // ─── Loading State ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a1628]">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a1628] pt-6">
      {/* ─── HEADER ────────────────────────────────────────────────── */}
      <ModernHeader
        avatarText={user?.displayName || "Driver"}
        notificationCount={notificationCount}
        onNotificationPress={() => {
          fetchNotifications();
          setShowNotifications(true);
        }}
        onAvatarPress={() => setShowProfileMenu(true)}
      />

      {/* ─── TABS ──────────────────────────────────────────────────── */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-[#0f172a] rounded-t-3xl max-h-[75%] min-h-[40%]">
            <View className="flex-row items-center justify-between p-4 border-b border-[#1e293b]">
              <View className="flex-row items-center gap-2">
                <Bell size={20} color="#0ea5e9" />
                <Text className="text-lg font-bold text-white">
                  Notifications
                </Text>
                {notificationCount > 0 && (
                  <View className="bg-red-500 rounded-full px-2 py-0.5">
                    <Text className="text-white text-xs font-bold">
                      {notificationCount}
                    </Text>
                  </View>
                )}
              </View>
              <View className="flex-row gap-3">
                {notifications.some((n) => !n.read) && (
                  <TouchableOpacity onPress={markAllAsRead}>
                    <Text className="text-[#0ea5e9] text-sm font-medium">
                      Mark all read
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotifications(false)}>
                  <Text className="text-[#0ea5e9] font-medium">Close</Text>
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              className="p-4"
              contentContainerStyle={{ flexGrow: 1 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => markAsRead(item.id)}
                  className={`p-3 rounded-xl mb-2 ${
                    !item.read
                      ? "bg-[#0ea5e9]/10 border-l-4 border-[#0ea5e9]"
                      : "bg-[#1e293b]/50"
                  }`}
                >
                  <Text
                    className={`font-semibold ${!item.read ? "text-white" : "text-gray-400"}`}
                  >
                    {item.title}
                  </Text>
                  <Text className="text-gray-400 text-sm mt-1">
                    {item.message}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1">
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="items-center py-12">
                  <Bell size={48} color="#475569" />
                  <Text className="text-gray-500 mt-4">
                    No notifications yet
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Profile Menu Modal */}
      <Modal
        visible={showProfileMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View className="absolute top-16 right-4 bg-[#0f172a] rounded-2xl shadow-2xl w-64 overflow-hidden border border-[#1e293b]">
            <View className="p-4 border-b border-[#1e293b] bg-[#0ea5e9]/5">
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 rounded-full bg-[#0ea5e9] items-center justify-center">
                  <Text className="text-white text-lg font-bold">
                    {user?.displayName?.charAt(0) || "D"}
                  </Text>
                </View>
                <View>
                  <Text className="text-white font-semibold text-base">
                    {user?.displayName || "Driver"}
                  </Text>
                  <Text className="text-gray-400 text-xs">
                    {user?.role || "Driver"} • {user?.email || ""}
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView>
              <TouchableOpacity
                className="flex-row items-center gap-3 p-4 border-b border-[#1e293b]"
                onPress={() => {
                  setShowProfileMenu(false);
                  router.push("/staff/(driver)/(tabs)/settings");
                }}
              >
                <User size={20} color="#94a3b8" />
                <Text className="text-gray-300 text-base">
                  Profile Settings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center gap-3 p-4 border-b border-[#1e293b]"
                onPress={() => {
                  setShowProfileMenu(false);
                  Alert.alert("Help", "Contact support at support@jeepqss.com");
                }}
              >
                <HelpCircle size={20} color="#94a3b8" />
                <Text className="text-gray-300 text-base">Help & Support</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-3 p-4"
                onPress={handleLogout}
              >
                <LogOut size={20} color="#ef4444" />
                <Text className="text-red-400 text-base font-medium">
                  Logout
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
