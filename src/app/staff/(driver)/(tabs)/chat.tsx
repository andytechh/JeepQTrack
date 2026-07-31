// app/staff/(driver)/chat.tsx (simplified)
import { useFocusEffect } from "expo-router";
import { Send } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { OptimizedMessage } from "../../../../src/shared/components/chat/OptimizedMessage";
import { useOptimizedChat } from "../../../../src/shared/hooks/useOptimizedChat";
import { useAuthStore } from "../../../../src/shared/store/authStore";

export default function ChatScreen() {
  const { user } = useAuthStore();
  const {
    messages,
    loading,
    sending,
    hasMore,
    unreadCount,
    sendMessage,
    loadOlderMessages,
    markAsRead,
    refreshMessages,
  } = useOptimizedChat();

  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMessage(newMessage);
      setNewMessage("");
    }
  };

  // Mark as read when screen focused
  useFocusEffect(
    useCallback(() => {
      markAsRead();
    }, [markAsRead]),
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <OptimizedMessage
        id={item.id}
        message={item.message}
        sender_id={item.sender_id}
        created_at={item.created_at}
        isOwn={item.sender_id === user?.uid}
        senderName={item.sender?.display_name || "Unknown"}
        senderAvatar={item.sender?.avatar_url}
      />
    ),
    [user?.uid],
  );

  if (loading) {
    return (
      <View className="flex-1 bg-[#0a1628] items-center justify-center">
        <Text className="text-white/60">Loading messages...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a1628]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
        <Text className="text-white text-lg font-bold">Staff Chat</Text>
        {unreadCount > 0 && (
          <View className="bg-red-500 rounded-full px-2 py-0.5">
            <Text className="text-white text-xs font-bold">{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onEndReached={hasMore ? loadOlderMessages : undefined}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        windowSize={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        getItemLayout={(_, index) => ({
          length: 60,
          offset: 60 * index,
          index,
        })}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-white/40">No messages yet</Text>
            <Text className="text-white/30 text-sm mt-1">
              Be the first to send a message!
            </Text>
          </View>
        }
      />

      {/* Input bar */}
      <View className="flex-row items-end p-4 border-t border-white/10 gap-2">
        <TextInput
          className="flex-1 bg-white/10 rounded-2xl px-4 py-3 text-white max-h-24"
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Message..."
          placeholderTextColor="#64748b"
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !newMessage.trim()}
          className={`w-12 h-12 rounded-full items-center justify-center ${
            newMessage.trim() && !sending ? "bg-sky-500" : "bg-white/5"
          }`}
        >
          <Send
            size={20}
            color={newMessage.trim() && !sending ? "white" : "#64748b"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
