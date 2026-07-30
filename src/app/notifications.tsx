// app/notifications.tsx
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowLeft, Bell, Check, CheckCheck, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { theme } from "../src/shared/constants/theme";
import { Notification, NotificationService } from "../src/shared/services/NotificationService";
import { useAuthStore } from "../src/shared/store/authStore";

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const userId = (user as any)?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userId) {
      loadNotifications();
    }
  }, [userId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await NotificationService.getNotifications(userId!);
      setNotifications(data);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      Toast.show({
        type: "success",
        text1: "Marked as read",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to mark as read",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead(userId!);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      Toast.show({
        type: "success",
        text1: "All marked as read",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to mark all as read",
      });
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await NotificationService.deleteNotification(id);
              setNotifications((prev) => prev.filter((n) => n.id !== id));
              Toast.show({
                type: "success",
                text1: "Deleted",
              });
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to delete",
              });
            }
          },
        },
      ],
    );
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      arrival: "#22c55e",
      dispatch: "#3b82f6",
      occupancy: "#f59e0b",
      eta: "#8b5cf6",
      status: "#06b6d4",
      queue: "#0ea5e9",
      system: "#64748b",
      chat: "#ec4899",
    };
    return colors[type] || colors.system;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      arrival: "🚌",
      dispatch: "🚀",
      occupancy: "⚠️",
      eta: "⏳",
      status: "📢",
      queue: "📋",
      system: "⚙️",
      chat: "💬",
    };
    return icons[type] || "📢";
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={{
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.05)",
        backgroundColor: !item.read ? "rgba(14,165,233,0.05)" : "transparent",
      }}
      onPress={() => {
        if (!item.read) {
          handleMarkAsRead(item.id);
        }
      }}
      onLongPress={() => handleDelete(item.id)}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: getTypeColor(item.type) + "20",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 20 }}>{getTypeIcon(item.type)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: "600",
                color: !item.read ? "#38bdf8" : "#ffffff",
                marginRight: 8,
              }}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={{ fontSize: 11, color: "#64748b" }}>
              {formatTime(item.created_at)}
            </Text>
          </View>

          <Text
            style={{
              fontSize: 13,
              color: "#94a3b8",
              marginTop: 4,
            }}
            numberOfLines={2}
          >
            {item.message}
          </Text>

          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 12 }}>
            {!item.read ? (
              <TouchableOpacity
                onPress={() => handleMarkAsRead(item.id)}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <Check size={14} color="#38bdf8" />
                <Text style={{ fontSize: 11, color: "#38bdf8", marginLeft: 4 }}>Mark read</Text>
              </TouchableOpacity>
            ) : (
              <CheckCheck size={14} color="#64748b" />
            )}

            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Trash2 size={14} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0a1628", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ color: "#94a3b8", marginTop: 12 }}>Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a1628" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1628" />

      <LinearGradient
        colors={["#0c4a6e", "#0a1628"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.5 }}
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 4 }}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>

          <Text style={{ flex: 1, color: "white", fontSize: 18, fontWeight: "bold", marginLeft: 12 }}>
            Notifications
          </Text>

          {unreadCount > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  backgroundColor: "rgba(14,165,233,0.2)",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#38bdf8", fontSize: 11, fontWeight: "600" }}>
                  {unreadCount} new
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
                onPress={handleMarkAllAsRead}
              >
                <Text style={{ color: "white", fontSize: 11 }}>Mark all read</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0ea5e9" />
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 }}>
            <Bell size={48} color="#334155" />
            <Text style={{ color: "white", fontSize: 18, fontWeight: "600", marginTop: 16 }}>
              No notifications
            </Text>
            <Text style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>
              You're all caught up!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}