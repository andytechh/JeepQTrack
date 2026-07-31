// app/staff/(driver)/chat.tsx
import { useFocusEffect } from "expo-router";
import { Send } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { OptimizedMessage } from "../../../../src/shared/components/chat/OptimizedMessage";
import { theme } from "../../../../src/shared/constants/theme";
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
  } = useOptimizedChat();

  const [newMessage, setNewMessage] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardVisible(true);
        const adjustedHeight = e.endCoordinates.height - 70;
        setKeyboardHeight(adjustedHeight > 0 ? adjustedHeight : 0);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMessage(newMessage);
      setNewMessage("");
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log("📱 Chat focused, marking as read");
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
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.colors.dark.background }}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.dark.background}
      />

      <View className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0a1628]">
          <Text className="text-white text-lg font-bold">Staff Chat</Text>
          {unreadCount > 0 && (
            <View className="bg-red-500 rounded-full px-2 py-0.5">
              <Text className="text-white text-xs font-bold">
                {unreadCount}
              </Text>
            </View>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          onEndReached={hasMore ? loadOlderMessages : undefined}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 10,
            flexGrow: 1,
          }}
          windowSize={10}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          onLayout={() => {
            if (messages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 100);
            }
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-white/40">No messages yet</Text>
              <Text className="text-white/30 text-sm mt-1">
                Be the first to send a message!
              </Text>
            </View>
          }
        />

        <View
          className="flex-row items-end p-4 border-t border-white/10 gap-2"
          style={{
            backgroundColor: theme.colors.dark.background,
            borderColor: "rgba(255,255,255,0.05)",
          }}
        >
          <TextInput
            ref={inputRef}
            className="flex-1 rounded-2xl px-4 py-3 text-white max-h-24"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.06)",
            }}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.dark.text.muted}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
            scrollEnabled={true}
            textAlignVertical="center"
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

        {keyboardVisible && keyboardHeight > 0 && (
          <View style={{ height: keyboardHeight }} />
        )}
      </View>
    </SafeAreaView>
  );
}
