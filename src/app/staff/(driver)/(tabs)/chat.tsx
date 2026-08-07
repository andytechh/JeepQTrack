// app/staff/(driver)/chat.tsx
import { useFocusEffect } from "expo-router";
import { SendHorizontal } from "lucide-react-native";
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
import { useOptimizedChat } from "../../../../src/shared/hooks/useOptimizedChat";
import { useAuthStore } from "../../../../src/shared/store/authStore";

const NEAR_LATEST_THRESHOLD = 50;
const PRESENCE_CHANNEL = "staff-presence";

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

  // ─── Presence state ──────────────────────────────────────────────
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const presenceChannelRef = useRef<any>(null);

  // ─── Keyboard ──────────────────────────────────────────────────────
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

  // ─── Fetch total members (static) ──────────────────────────────
  useEffect(() => {
    const fetchTotalMembers = async () => {
      try {
        const { count, error } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .in("role", ["dispatcher", "driver", "staff"]);
        if (!error && count !== null) {
          setTotalMembers(count);
        }
      } catch (e) {
        console.error("Failed to fetch member count:", e);
      }
    };
    fetchTotalMembers();
  }, []);

  // ─── Presence setup ──────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: user.uid } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const onlineUsers = Object.keys(state).filter((uid) => {
          const presenceData = state[uid] as any[];
          return presenceData?.some((p) => p.status === "online");
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

  // ─── Update presence status on app state changes ──────────────────
  useEffect(() => {
    const handleAppStateChange = (nextState: string) => {
      if (presenceChannelRef.current && user?.uid) {
        presenceChannelRef.current.track({
          user_id: user.uid,
          status: "online", // keep online even in background
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

  // ─── Mark as read on focus ──────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (unreadCount > 0) markAsRead();
    }, [unreadCount, markAsRead]),
  );

  // ─── Scroll helpers ──────────────────────────────────────────────
  const handleScroll = useCallback(({ nativeEvent }: any) => {
    const { contentOffset } = nativeEvent;
    isNearLatestRef.current = contentOffset.y < NEAR_LATEST_THRESHOLD;
  }, []);

  const scrollToLatestIfNeeded = useCallback(() => {
    if (isNearLatestRef.current && messages.length > 0) {
      flatListRef.current?.scrollToIndex({ index: 0, animated: true });
    }
  }, [messages.length]);

  // ─── Send ──────────────────────────────────────────────────────────
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

  // ─── Pagination ──────────────────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    await loadOlderMessages();
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, loadOlderMessages]);

  // ─── Data ──────────────────────────────────────────────────────────
  const displayMessages = useMemo(() => [...messages].reverse(), [messages]);

  const renderMessage = useCallback(
    ({ item }: { item: (typeof messages)[number] }) => {
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
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* ─── Header ────────────────────────────────────────────────── */}
      <View className="px-4 py-3 border-b border-slate-200 bg-white">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-slate-900">Staff Chat</Text>
          <UnreadBadge />
        </View>
        <View className="flex-row items-center mt-0.5">
          <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
          <Text className="text-xs text-slate-600">
            {onlineCount} online · {totalMembers} members
          </Text>
        </View>
      </View>

      {/* ─── Chat list ────────────────────────────────────────────── */}
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
            <Text className="text-slate-400">No messages yet. Say hello!</Text>
          </View>
        }
      />

      {/* ─── Input bar ────────────────────────────────────────────── */}
      <View className="px-3 py-2 border-t border-slate-200 bg-white flex-row items-end">
        <TextInput
          className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-slate-900 max-h-24"
          placeholder="Type a message..."
          placeholderTextColor="#94a3b8"
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
          className="ml-2 w-10 h-10 rounded-full bg-sky-500 items-center justify-center disabled:opacity-50"
        >
          {sending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <SendHorizontal size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Keyboard spacer ────────────────────────────────────── */}
      {keyboardHeight > 0 && <View style={{ height: keyboardHeight + 15 }} />}
    </SafeAreaView>
  );
}
