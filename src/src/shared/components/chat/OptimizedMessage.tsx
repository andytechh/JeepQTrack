// src/shared/components/chat/OptimizedMessage.tsx
import React from "react";
import { Text, View } from "react-native";

interface MessageProps {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  isOwn: boolean;
  senderName: string;
  senderAvatar?: string;
}

// Only re-renders if props actually change
export const OptimizedMessage = React.memo(
  ({ message, isOwn, senderName, created_at }: MessageProps) => {
    return (
      <View className={`mb-3 max-w-[85%] ${isOwn ? "self-end" : "self-start"}`}>
        {!isOwn && (
          <Text className="text-xs text-sky-400 mb-1 ml-2">{senderName}</Text>
        )}
        <View
          className={`p-3 rounded-2xl ${isOwn ? "bg-sky-500 rounded-tr-none" : "bg-white/10 rounded-tl-none"}`}
        >
          <Text className="text-white text-sm">{message}</Text>
        </View>
        <Text
          className={`text-[10px] text-white/40 mt-1 ${isOwn ? "text-right mr-2" : "text-left ml-2"}`}
        >
          {new Date(created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  },
  // Custom comparison - only re-render if these change
  (prevProps, nextProps) => {
    return (
      prevProps.id === nextProps.id &&
      prevProps.message === nextProps.message &&
      prevProps.isOwn === nextProps.isOwn
    );
  },
);
