// app/staff/(driver)/chat.tsx
import { useFocusEffect } from "expo-router";
import { Paperclip, SendHorizontal, Users } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Smart scroll state
  const [isNearBottom, setIsNearBottom] = useState(true);
  const isNearBottomRef = useRef(true);
  const firstUnreadIndex = useRef<number | null>(null);
  const didScrollToUnread = useRef(false);

  // Dynamic participant count
  const participantCount = useMemo(
    () => new Set(messages.map((m) => m.sender_id)).size,
    [messages],
  );

  // Terminal name (adjust to your user model)
  const terminalNames: Record<number, string> = { 1: "Donsol", 2: "Daraga" };
  const currentTerminal =
    (user as any)?.terminal_id && terminalNames[(user as any).terminal_id]
      ? terminalNames[(user as any).terminal_id]
      : "Terminal";

  // ─── Find first unread message ─────────────────────────────────
  useEffect(() => {
    if (messages.length > 0 && user?.uid && !didScrollToUnread.current) {
      const idx = messages.findIndex(
        (m) => m.sender_id !== user.uid && !m.read_by?.includes(user.uid),
      );
      if (idx !== -1) {
        firstUnreadIndex.current = idx;
      }
    }
  }, [messages, user?.uid]);

  // Scroll to first unread on initial load
  const handleLayout = useCallback(() => {
    if (
      firstUnreadIndex.current !== null &&
      !didScrollToUnread.current &&
      flatListRef.current
    ) {
      flatListRef.current.scrollToIndex({
        index: firstUnreadIndex.current,
        animated: false,
        viewPosition: 0.5,
      });
      didScrollToUnread.current = true;
    }
  }, []);

  // ─── Track scroll position ────────────────────────────────────
  const handleScroll = useCallback(({ nativeEvent }: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const bottomOffset =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    const near = bottomOffset < 20;
    setIsNearBottom(near);
    isNearBottomRef.current = near;
  }, []);

  const handleContentSizeChange = useCallback(() => {
    // Only auto-scroll if user is at the bottom (prevents jump)
    if (isNearBottomRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [messages]);

  // ─── Keyboard handling (keep original) ────────────────────────
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      const inputBarHeight = 70;
      setKeyboardHeight(e.endCoordinates.height - inputBarHeight);
      if (isNearBottomRef.current) {
        setTimeout(
          () => flatListRef.current?.scrollToEnd({ animated: true }),
          100,
        );
      }
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
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
        read={item.read_by?.includes(user?.uid ?? "")} // pass read status
      />
    ),
    [user?.uid],
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-light-background dark:bg-slate-900 items-center justify-center">
        <Text className="text-light-text-muted dark:text-slate-400">
          Loading messages...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-light-background dark:bg-slate-900">
      {/* Header – new UI */}
      <View className="flex-row items-center justify-between border-b border-light-border dark:border-slate-700 px-4 py-3 bg-light-background dark:bg-slate-900">
        <View className="flex-col gap-0.5">
          <Text className="text-base font-bold text-light-text-primary dark:text-white">
            Staff chat
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Users size={14} color={theme.colors.light.text.muted} />
            <Text className="text-xs text-light-text-muted dark:text-slate-400">
              {participantCount > 0
                ? `${participantCount} participant${participantCount > 1 ? "s" : ""}`
                : "No participants yet"}
              {" · "}
              {currentTerminal}
            </Text>
          </View>
        </View>
        {/* Online indicator – static for now */}
        <View className="flex-row items-center gap-1.5">
          <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <Text className="text-xs font-medium text-green-600">Online</Text>
        </View>
      </View>

      {/* Messages – smart scroll */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onEndReached={hasMore ? loadOlderMessages : undefined}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ padding: 16, paddingBottom: 10, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout} // scroll to first unread
        windowSize={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-light-text-dim dark:text-slate-500">
              No messages yet
            </Text>
            <Text className="text-light-text-dim dark:text-slate-500 text-sm mt-1">
              Be the first to send a message!
            </Text>
          </View>
        }
      />

      {/* Input bar – new UI with paperclip */}
      <View className="border-t border-light-border dark:border-slate-700 px-4 py-3 bg-light-background dark:bg-slate-900">
        <View className="flex-row items-end gap-2">
          <View className="flex-1 flex-row items-end bg-light-surface-secondary dark:bg-slate-800 rounded-xl border border-light-border dark:border-slate-700 px-3 py-2">
            <TextInput
              ref={inputRef}
              className="flex-1 text-base text-light-text-primary dark:text-white max-h-24"
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Message the terminal team…"
              placeholderTextColor={theme.colors.light.text.muted}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSend}
              scrollEnabled
              textAlignVertical="center"
            />
            <TouchableOpacity className="p-1">
              <Paperclip size={18} color={theme.colors.light.text.muted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || !newMessage.trim()}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              newMessage.trim() && !sending
                ? "bg-primary-500"
                : "bg-light-surface-secondary dark:bg-slate-700"
            }`}
          >
            <SendHorizontal
              size={18}
              color={
                newMessage.trim() && !sending
                  ? "white"
                  : theme.colors.light.text.muted
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {keyboardHeight > 0 && <View style={{ height: keyboardHeight }} />}
    </SafeAreaView>
  );
}
