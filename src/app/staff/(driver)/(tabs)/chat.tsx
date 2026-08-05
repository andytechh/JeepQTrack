import { useFocusEffect } from "expo-router";
import { SendHorizontal } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { OptimizedMessage } from "../../../../src/shared/components/chat/OptimizedMessage";
import { useOptimizedChat } from "../../../../src/shared/hooks/useOptimizedChat";
import { useAuthStore } from "../../../../src/shared/store/authStore";

const NEAR_LATEST_THRESHOLD = 50;

export default function StaffGroupChatScreen() {
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

  const [inputText, setInputText] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isNearLatestRef = useRef(true);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      const inputBarHeight = 70;
      const adjusted = e.endCoordinates.height - inputBarHeight;
      setKeyboardHeight(adjusted > 0 ? adjusted : 0);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (unreadCount > 0) markAsRead();
    }, [unreadCount, markAsRead]),
  );

  const handleScroll = useCallback(({ nativeEvent }: any) => {
    const { contentOffset } = nativeEvent;
    isNearLatestRef.current = contentOffset.y < NEAR_LATEST_THRESHOLD;
  }, []);

  const scrollToLatestIfNeeded = useCallback(() => {
    if (isNearLatestRef.current) {
      flatListRef.current?.scrollToIndex({ index: 0, animated: false });
    }
  }, []);

  // Send message
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;
    try {
      await sendMessage(trimmed);
      setInputText("");
      if (isNearLatestRef.current) {
        setTimeout(
          () =>
            flatListRef.current?.scrollToIndex({ index: 0, animated: true }),
          100,
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [inputText, sending, sendMessage]);

  // Pagination
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    await loadOlderMessages();
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, loadOlderMessages]);

  const displayMessages = useMemo(() => [...messages].reverse(), [messages]);

  const renderMessage = useCallback(
    ({ item }: { item: (typeof messages)[number] }) => {
      const isOwn = item.sender_id === user?.uid;
      const senderRole = item.sender?.role || "";
      const readByOthers =
        isOwn && item.read_by?.filter((id) => id !== user?.uid).length > 0;
      return (
        <OptimizedMessage
          id={item.id}
          message={item.message}
          sender_id={item.sender_id}
          created_at={item.created_at}
          isOwn={isOwn}
          senderName={item.sender?.display_name ?? "Staff"}
          senderRole={item.sender?.role ?? "staff"}
          senderAvatar={item.sender?.avatar_url}
          read={readByOthers}
        />
      );
    },
    [user?.uid],
  );

  const UnreadBadge = () => {
    if (unreadCount <= 0) return null;
    return (
      <View className="ml-2 bg-red-500 rounded-full min-w-[22px] h-[22px] items-center justify-center px-1">
        <Text className="text-white text-xs font-bold">
          {unreadCount > 99 ? "99+" : unreadCount}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#6b7280" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Staff Chat
          </Text>
          <UnreadBadge />
        </View>
      </View>

      {/* Chat list */}
      <FlatList
        ref={flatListRef}
        data={displayMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingBottom: 8,
          paddingTop: 4,
        }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        removeClippedSubviews={Platform.OS === "android"}
        windowSize={10}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        // Auto‑scroll only if user is viewing latest
        onContentSizeChange={scrollToLatestIfNeeded}
        ListFooterComponent={
          isLoadingMore ? (
            <View className="py-2 items-center">
              <ActivityIndicator size="small" color="#9ca3af" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-500 dark:text-slate-400">
              No messages yet. Say hello!
            </Text>
          </View>
        }
      />

      {/* Input bar */}
      <View className="px-3 py-2 border-t border-gray-200 dark:border-slate-700 flex-row items-end bg-white dark:bg-slate-900">
        <TextInput
          className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-full px-4 py-2 text-gray-900 dark:text-white max-h-24"
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
          value={inputText}
          onChangeText={setInputText}
          multiline
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          className="ml-2 w-10 h-10 rounded-full bg-primary-500 items-center justify-center disabled:opacity-50"
        >
          {sending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <SendHorizontal size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Keyboard spacer */}
      {keyboardHeight > 0 && <View style={{ height: keyboardHeight + 15 }} />}
    </SafeAreaView>
  );
}
