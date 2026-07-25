import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Bell } from "lucide-react-native";
import { useAuthStore } from "../../store/authStore";
import { NotificationService } from "../../services/NotificationService";
import { theme } from "../../constants/theme";
export function NotificationBadge() {
  const { user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    const loadCount = async () => {
      const count = await NotificationService.getUnreadCount(user.uid);
      setUnreadCount(count);
    };

    loadCount();

    // Subscribe to real-time updates
    const channel = NotificationService.subscribeToNotifications(
      user.uid,
      (notification) => {
        if (!notification.read) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    );

    return () => {
      channel.unsubscribe();
    };
  }, [user?.uid]);

  const handlePress = () => {
    // Navigate to notifications screen
    navigation.navigate("Notifications" as never);
  };

  return (
    <TouchableOpacity onPress={handlePress} className="relative p-2">
      <Bell size={24} color={theme.colors.dark.text.primary} />
      {unreadCount > 0 && (
        <View
          className="absolute -top-1 -right-1 rounded-full items-center justify-center min-w-[20px] h-[20px] px-1"
          style={{ backgroundColor: theme.colors.primary[500] }}
        >
          <Text className="text-white text-xs font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}