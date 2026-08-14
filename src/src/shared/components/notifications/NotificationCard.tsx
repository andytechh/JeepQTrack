import {
  BusFront,
  CheckCircle2,
  Clock3,
  Info,
  MessageCircle,
  Navigation,
  Users
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { AppNotification, NotificationType } from "../../hooks/useNotification";

interface NotificationCardProps {
  notification: AppNotification;
  onPress?: () => void;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "arrival":
      return <BusFront size={20} color="#10B981" />;

    case "dispatch":
      return <Navigation size={20} color="#0EA5E9" />;

    case "occupancy":
      return <Users size={20} color="#F59E0B" />;

    case "eta":
      return <Clock3 size={20} color="#8B5CF6" />;

    case "status":
      return <CheckCircle2 size={20} color="#0EA5E9" />;

    case "queue":
      return <BusFront size={20} color="#14B8A6" />;

    case "chat":
      return <MessageCircle size={20} color="#6366F1" />;

    case "system":
    default:
      return <Info size={20} color="#64748B" />;
  }
}

function getIconBackground(type: NotificationType) {
  switch (type) {
    case "arrival":
      return "bg-emerald-50";

    case "dispatch":
      return "bg-sky-50";

    case "occupancy":
      return "bg-amber-50";

    case "eta":
      return "bg-violet-50";

    case "status":
      return "bg-sky-50";

    case "queue":
      return "bg-teal-50";

    case "chat":
      return "bg-indigo-50";

    case "system":
    default:
      return "bg-slate-100";
  }
}

function getTypeLabel(type: NotificationType) {
  switch (type) {
    case "arrival":
      return "ARRIVAL";

    case "dispatch":
      return "DISPATCH";

    case "occupancy":
      return "OCCUPANCY";

    case "eta":
      return "ETA";

    case "status":
      return "STATUS";

    case "queue":
      return "QUEUE";

    case "chat":
      return "CHAT";

    case "system":
    default:
      return "SYSTEM";
  }
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());

  const seconds = Math.floor(diff / 1000);

  if (seconds < 30) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days}d`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function NotificationCard({
  notification,
  onPress,
}: NotificationCardProps) {
  const unread = !notification.read;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{
        color: "#E0F2FE",
      }}
      className={`mb-3 overflow-hidden rounded-[22px] border bg-white ${
        unread ? "border-ocean-200" : "border-white"
      }`}
      style={{
        shadowColor: "#0284C7",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: unread ? 0.09 : 0.05,
        shadowRadius: 12,
        elevation: unread ? 4 : 2,
      }}
    >
      <View className="flex-row p-4">
        <View
          className={`h-11 w-11 items-center justify-center rounded-[15px] ${getIconBackground(
            notification.type,
          )}`}
        >
          {getNotificationIcon(notification.type)}
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-start">
            <View className="flex-1 pr-2">
              <Text
                numberOfLines={2}
                className={`text-[14px] ${
                  unread
                    ? "font-extrabold text-slate-900"
                    : "font-bold text-slate-700"
                }`}
              >
                {notification.title}
              </Text>
            </View>

            {unread && (
              <View className="mt-1 h-2.5 w-2.5 rounded-full bg-ocean-500" />
            )}
          </View>

          <Text
            numberOfLines={3}
            className="mt-1.5 text-[12px] leading-5 text-slate-500"
          >
            {notification.message}
          </Text>

          <View className="mt-2 flex-row items-center">
            <View className="rounded-full bg-slate-50 px-2 py-1">
              <Text className="text-[8px] font-extrabold tracking-wide text-slate-400">
                {getTypeLabel(notification.type)}
              </Text>
            </View>

            <Text className="ml-2 text-[10px] font-semibold text-slate-400">
              {formatRelativeTime(notification.created_at)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
