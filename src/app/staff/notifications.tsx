// app/staff/notifications.tsx
import { LinearGradient } from "expo-linear-gradient";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react-native";
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
import { theme } from "../../src/shared/constants/theme";
import {
  Notification,
  NotificationService,
} from "../../src/shared/services/NotificationService";
import { useAuthStore } from "../../src/shared/store/authStore";

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      loadNotifications();
    }
  }, [user?.uid]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await NotificationService.getNotifications(user!.uid);
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
        prev.map((n) =>
          n.id === id
            ? { ...n, read: true, updated_at: new Date().toISOString() }
            : n,
        ),
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
      await NotificationService.markAllAsRead(user!.uid);
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read: true,
          updated_at: new Date().toISOString(),
        })),
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

  const getTypeColor = (type: Notification["type"]) => {
    const colors = {
      arrival: theme.colors.success[500],
      dispatch: theme.colors.primary[500],
      occupancy: theme.colors.warning[500],
      eta: theme.colors.info[500],
      status: theme.colors.secondary[500],
      queue: theme.colors.primary[400],
      system: theme.colors.dark.text.muted,
      chat: theme.colors.primary[300],
    };
    return colors[type] || colors.system;
  };

  const getTypeIcon = (type: Notification["type"]) => {
    // You can add specific icons per type
    return "📢";
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      className={`p-4 border-b ${!item.read ? "bg-primary-500/5" : ""}`}
      style={{
        borderColor: theme.colors.dark.border,
        backgroundColor: !item.read ? "rgba(14,165,233,0.05)" : "transparent",
      }}
      onPress={() => {
        if (!item.read) {
          handleMarkAsRead(item.id);
        }
      }}
      onLongPress={() => handleDelete(item.id)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: getTypeColor(item.type) + "20" }}
        >
          <Text className="text-xl">{getTypeIcon(item.type)}</Text>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text
              className={`text-sm font-semibold flex-1 mr-2 ${
                !item.read ? "text-primary-400" : "text-white"
              }`}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              className="text-xs"
              style={{ color: theme.colors.dark.text.muted }}
            >
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>

          <Text
            className="text-sm mt-1"
            style={{ color: theme.colors.dark.text.secondary }}
            numberOfLines={2}
          >
            {item.message}
          </Text>

          <View className="flex-row items-center justify-end mt-2 space-x-3">
            {!item.read ? (
              <TouchableOpacity
                onPress={() => handleMarkAsRead(item.id)}
                className="flex-row items-center"
              >
                <Check size={16} color={theme.colors.primary[400]} />
                <Text
                  className="text-xs ml-1"
                  style={{ color: theme.colors.primary[400] }}
                >
                  Mark as read
                </Text>
              </TouchableOpacity>
            ) : (
              <CheckCheck size={16} color={theme.colors.dark.text.muted} />
            )}

            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Trash2 size={16} color={theme.colors.dark.text.muted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.colors.dark.background }}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.dark.background}
      />

      <View className="flex-1">
        {/* Header */}
        <LinearGradient
          colors={theme.colors.gradient.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.5 }}
          className="flex-row items-center justify-between px-4 pt-4 pb-3"
        >
          <Text className="text-white text-lg font-bold">Notifications</Text>

          {notifications.some((n) => !n.read) && (
            <TouchableOpacity
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              onPress={handleMarkAllAsRead}
            >
              <Text className="text-white text-xs">Mark all read</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <Text
              className="mt-4"
              style={{ color: theme.colors.dark.text.muted }}
            >
              Loading notifications...
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotification}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary[500]}
              />
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Bell size={48} color={theme.colors.dark.text.dim} />
                <Text className="text-lg font-semibold text-white mt-4">
                  No notifications
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.dark.text.muted }}
                >
                  You're all caught up!
                </Text>
              </View>
            }
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 20,
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
