// app/staff/(driver)/_layout.tsx
import { router, Tabs, useSegments } from "expo-router";
import {
  Bell,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageCircle,
  Settings,
  User,
} from "lucide-react-native";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { ModernHeader } from "../../../../src/shared/components";
import { supabase } from "../../../../src/shared/config/supabase";
import { AuthService } from "../../../../src/shared/services/AuthService";
import { NotificationService } from "../../../../src/shared/services/NotificationService";
import { useAuthStore } from "../../../../src/shared/store/authStore";

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
  const segments = useSegments();

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
      // Update count
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

  const handleNotificationPress = () => {
    fetchNotifications();
    setShowNotifications(true);
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
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  const handleProfilePress = () => {
    setShowProfileMenu(true);
  };

  // ─── Real-time Subscriptions ─────────────────────────────────────

  useEffect(() => {
    if (isLoading || !user?.uid) return;

    fetchNotificationCount();

    const setupSubscription = async () => {
      try {
        // Check if notifications table exists
        const { error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .limit(1);

        if (error) {
          console.log("📢 Notifications table not ready yet");
          return;
        }

        // Clean up existing subscription
        if (channelRef.current) {
          channelRef.current.unsubscribe();
          channelRef.current = null;
        }

        const channelName = `notifications_${user.uid}`;

        const channel = supabase.channel(channelName).on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.uid}`,
          },
          () => {
            // Refresh notification count when new notification arrives
            fetchNotificationCount();
            // If notifications modal is open, refresh the list
            if (showNotifications) {
              fetchNotifications();
            }
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
        <Text className="mt-4 text-white/60">Loading dashboard...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a1628]">
        <Text className="text-white/60">No user found</Text>
        <TouchableOpacity
          className="mt-4 bg-primary-500 px-6 py-2.5 rounded-xl"
          onPress={() => router.replace("/staff/login")}
        >
          <Text className="text-white font-medium">Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-[#0a1628]">
      <ModernHeader
        avatarText={user?.displayName || "Driver"}
        notificationCount={notificationCount}
        onNotificationPress={handleNotificationPress}
        onAvatarPress={handleProfilePress}
      />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#0ea5e9",
          tabBarInactiveTintColor: "#64748b",
          tabBarStyle: {
            backgroundColor: "#0f172a",
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.05)",
            height: 65,
            paddingBottom: 8,
            paddingTop: 4,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <LayoutDashboard size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="gps-tracking"
          options={{
            title: "Tracking",
            tabBarIcon: ({ color, size }) => (
              <MapPin size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="queue-status"
          options={{
            title: "Queue",
            tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Chat",
            tabBarIcon: ({ color, size }) => (
              <MessageCircle size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <Settings size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* ─── Notifications Modal ───────────────────────────────────── */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-[#0f172a] rounded-t-3xl max-h-[75%] min-h-[40%]">
            {/* Header */}
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

            {/* List */}
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
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-semibold ${
                      !item.read ? "text-white" : "text-gray-400"
                    }`}
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
                  <Text className="text-gray-500 mt-4 text-center">
                    No notifications yet
                  </Text>
                  <Text className="text-gray-600 text-sm text-center mt-1">
                    You'll see notifications here when you receive them
                  </Text>
                </View>
              }
              refreshing={isFetchingNotifications}
              onRefresh={fetchNotifications}
            />
          </View>
        </View>
      </Modal>

      {/* ─── Profile Menu Modal ───────────────────────────────────── */}
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
            {/* User Info */}
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

            {/* Menu Items */}
            <ScrollView>
              <TouchableOpacity
                className="flex-row items-center gap-3 p-4 border-b border-[#1e293b]"
                onPress={() => {
                  setShowProfileMenu(false);
                  router.push("/staff/(driver)/settings");
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
                  router.push("/staff/(driver)/notifications");
                }}
              >
                <Bell size={20} color="#94a3b8" />
                <View className="flex-row items-center flex-1">
                  <Text className="text-gray-300 text-base">Notifications</Text>
                  {notificationCount > 0 && (
                    <View className="ml-2 bg-red-500 rounded-full px-2 py-0.5">
                      <Text className="text-white text-xs font-bold">
                        {notificationCount}
                      </Text>
                    </View>
                  )}
                </View>
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
    </SafeAreaView>
  );
}
