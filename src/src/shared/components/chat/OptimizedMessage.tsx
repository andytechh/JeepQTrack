// src/shared/components/chat/OptimizedMessage.tsx
import { CheckCheck } from "lucide-react-native";
import { memo } from "react";
import { Image, Text, View } from "react-native";
import { theme } from "../../constants/theme";

interface MessageProps {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  isOwn: boolean;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  read?: boolean; // add this if your hook provides it
}

export const OptimizedMessage = memo(
  ({
    message,
    isOwn,
    senderName,
    senderAvatar,
    senderRole,
    created_at,
    read,
  }: MessageProps & { senderRole?: string }) => {
    const initials = senderName?.[0]?.toUpperCase() || "?";
    const timestamp = new Date(created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return (
      <View
        className={`flex-row mb-4 gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
      >
        {!isOwn && (
          <View className="w-8 h-8 rounded-full bg-light-surface-secondary dark:bg-slate-700 items-center justify-center self-end">
            {senderAvatar ? (
              <Image
                source={{ uri: senderAvatar }}
                className="w-full h-full rounded-full"
              />
            ) : (
              <Text className="text-xs font-semibold text-light-text-muted dark:text-slate-400">
                {initials}
              </Text>
            )}
          </View>
        )}

        <View
          className={`flex-col max-w-[75%] ${isOwn ? "items-end self-end" : "items-start self-start"}`}
        >
          {!isOwn && (
            <View className="flex-row items-center gap-1 ml-1 mb-1">
              <Text className="text-xs text-light-text-muted dark:text-slate-400">
                {senderName}
              </Text>
              {senderRole ? (
                <Text className="text-[10px] text-light-text-dim dark:text-slate-500 uppercase">
                  ({senderRole})
                </Text>
              ) : null}
            </View>
          )}

          <View
            className={`rounded-xl px-3 py-2 ${
              isOwn
                ? "bg-primary-500 dark:bg-primary-600 self-end"
                : "bg-light-surface-secondary dark:bg-slate-800 self-start"
            }`}
          >
            <Text
              className={`text-sm leading-relaxed ${
                isOwn ? "text-white" : "text-light-text-primary dark:text-white"
              }`}
            >
              {message}
            </Text>
          </View>

          <View className="flex-row items-center gap-1 mt-1 px-1">
            <Text className="text-[10px] text-light-text-dim dark:text-slate-500">
              {timestamp}
            </Text>
            {isOwn && read && (
              <CheckCheck size={14} color={theme.colors.primary[500]} />
            )}
          </View>
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.id === next.id &&
    prev.message === next.message &&
    prev.isOwn === next.isOwn &&
    prev.senderRole === next.senderRole,
);
