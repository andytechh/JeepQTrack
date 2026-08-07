// app/staff/(driver)/chat.tsx
import { useFocusEffect } from "expo-router";
import { Check, SendHorizontal, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
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
import { supabase } from "../../../../src/shared/config/supabase";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import { useOptimizedChat } from "../../../../src/shared/hooks/useOptimizedChat";
import { useAuthStore } from "../../../../src/shared/store/authStore";

const NEAR_LATEST_THRESHOLD = 50;
const PRESENCE_CHANNEL = "staff-presence";

export default function StaffGroupChatScreen() {
  const { user } = useAuthStore();
  const { isDark } = useTheme(); // 👈 dark mode

  const {
    messages,
    loading,
    sending,
    hasMore,
    unreadCount,
    sendMessage,
    loadOlderMessages,
    markAsRead,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  } = useOptimizedChat();

  const [inputText, setInputText] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isNearLatestRef = useRef(true);
  const inputRef = useRef<TextInput>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Presence
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const presenceChannelRef = useRef<any>(null);

  // Keyboard
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      const inputBarHeight = 70;
      const adjusted = e.endCoordinates.height - inputBarHeight;
      setKeyboardHeight(adjusted > 0 ? adjusted : 0);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Fetch total members
  useEffect(() => {
    const fetchTotalMembers = async () => {
      try {
        const { count, error } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .in("role", ["dispatcher", "driver", "staff"]);
        if (!error && count !== null) setTotalMembers(count);
      } catch (e) {
        /* ignore */
      }
    };
    fetchTotalMembers();
  }, []);

  // Presence
  useEffect(() => {
    if (!user?.uid) return;
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: user.uid } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const onlineUsers = Object.keys(state).filter((uid) => {
          const data = state[uid] as any[];
          return data?.some((p) => p.status === "online");
        });
        setOnlineCount(onlineUsers.length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.uid,
            display_name: user.displayName || "Staff",
            status: "online",
            last_seen: new Date().toISOString(),
          });
        }
      });
    presenceChannelRef.current = channel;
    return () => {
      if (channel) {
        channel.untrack();
        channel.unsubscribe();
      }
    };
  }, [user?.uid]);

  useEffect(() => {
    const handleAppStateChange = (nextState: string) => {
      if (presenceChannelRef.current && user?.uid) {
        presenceChannelRef.current.track({
          user_id: user.uid,
          status: "online",
          last_seen: new Date().toISOString(),
        });
      }
    };
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [user?.uid]);

  // Mark as read
  useFocusEffect(
    useCallback(() => {
      if (unreadCount > 0) markAsRead();
    }, [unreadCount, markAsRead]),
  );

  // Scroll
  const handleScroll = useCallback(({ nativeEvent }: any) => {
    const { contentOffset } = nativeEvent;
    isNearLatestRef.current = contentOffset.y < NEAR_LATEST_THRESHOLD;
  }, []);

  const scrollToLatestIfNeeded = useCallback(() => {
    if (isNearLatestRef.current && messages.length > 0) {
      flatListRef.current?.scrollToIndex({ index: 0, animated: true });
    }
  }, [messages.length]);

  // Edit handlers
  const handleEditMessage = useCallback(
    (messageId: string, currentText: string) => {
      setEditingMessageId(messageId);
      setInputText(currentText);
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [],
  );

  const cancelEditing = useCallback(() => {
    setEditingMessageId(null);
    setInputText("");
  }, []);

  const handleUpdateMessage = useCallback(async () => {
    if (!editingMessageId || !inputText.trim()) return;
    try {
      await editMessage(editingMessageId, inputText.trim());
      cancelEditing();
    } catch (error) {
      console.error("Update failed:", error);
    }
  }, [editingMessageId, inputText, editMessage, cancelEditing]);

  const handleSend = useCallback(async () => {
    if (editingMessageId) {
      await handleUpdateMessage();
      return;
    }
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
      console.error("Send error:", error);
    }
  }, [inputText, sending, sendMessage, editingMessageId, handleUpdateMessage]);

  // Pagination
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    await loadOlderMessages();
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, loadOlderMessages]);

  // Data
  const displayMessages = useMemo(() => [...messages].reverse(), [messages]);

  const renderMessage = useCallback(
    ({ item }: { item: (typeof messages)[0] }) => {
      const isOwn = item.sender_id === user?.uid;
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
          edited={!!item.edited_at}
          deleted={!!item.deleted_at}
          reactions={item.reactions || {}}
          onEdit={handleEditMessage}
          onDelete={deleteMessage}
          onAddReaction={addReaction}
          onRemoveReaction={removeReaction}
          currentUserId={user?.uid}
          isDark={isDark} // 👈 pass dark mode
        />
      );
    },
    [
      user?.uid,
      deleteMessage,
      handleEditMessage,
      addReaction,
      removeReaction,
      isDark,
    ],
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
      <SafeAreaView
        className={`flex-1 items-center justify-center ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text
          className={`mt-4 text-sm ${isDark ? "text-slate-400" : "text-slate-400"}`}
        >
          Loading messages...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
    >
      {/* Header */}
      <View
        className={`px-4 py-3 border-b ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
      >
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            Staff Chat
          </Text>
          <UnreadBadge />
        </View>
        <View className="flex-row items-center mt-0.5">
          <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
          <Text
            className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}
          >
            {onlineCount} online · {totalMembers} members
          </Text>
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
        onContentSizeChange={scrollToLatestIfNeeded}
        ListFooterComponent={
          isLoadingMore ? (
            <View className="py-2 items-center">
              <ActivityIndicator size="small" color="#94a3b8" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className={isDark ? "text-slate-400" : "text-slate-400"}>
              No messages yet. Say hello!
            </Text>
          </View>
        }
      />

      {/* Input area */}
      <View
        className={`border-t ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
      >
        {editingMessageId && (
          <View
            className={`flex-row items-center justify-between px-3 py-1.5 ${isDark ? "bg-slate-700 border-slate-600" : "bg-blue-50 border-blue-100"} border-b`}
          >
            <Text
              className={`text-sm ${isDark ? "text-sky-300" : "text-sky-600"}`}
            >
              Editing message
            </Text>
            <TouchableOpacity onPress={cancelEditing} className="p-1">
              <X size={18} color={isDark ? "#94a3b8" : "#64748b"} />
            </TouchableOpacity>
          </View>
        )}
        <View className="px-3 py-2 flex-row items-end">
          <TextInput
            ref={inputRef}
            className={`flex-1 rounded-full px-4 py-2 text-base max-h-24 ${
              isDark ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-900"
            }`}
            placeholder={
              editingMessageId ? "Edit your message..." : "Type a message..."
            }
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
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
            className={`ml-2 w-10 h-10 rounded-full items-center justify-center ${
              !inputText.trim() || sending
                ? isDark
                  ? "bg-slate-700"
                  : "bg-slate-200"
                : editingMessageId
                  ? "bg-emerald-500"
                  : "bg-sky-500"
            }`}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : editingMessageId ? (
              <Check size={20} color="white" />
            ) : (
              <SendHorizontal size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Keyboard spacer */}
      {keyboardHeight > 0 && <View style={{ height: keyboardHeight + 15 }} />}
    </SafeAreaView>
  );
}
