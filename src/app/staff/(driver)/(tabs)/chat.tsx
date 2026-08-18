// // app/staff/(driver)/chat.tsx
// import { useFocusEffect } from "expo-router";
// import { Check, SendHorizontal, X } from "lucide-react-native";
// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import {
//   ActivityIndicator,
//   AppState,
//   FlatList,
//   Keyboard,
//   Platform,
//   SafeAreaView,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { OptimizedMessage } from "../../../../src/shared/components/chat/OptimizedMessage";
// import { supabase } from "../../../../src/shared/config/supabase";
// import { useTheme } from "../../../../src/shared/context/ThemeContext";
// import { useOptimizedChat } from "../../../../src/shared/hooks/useOptimizedChat";
// import { useAuthStore } from "../../../../src/shared/store/authStore";

// const NEAR_LATEST_THRESHOLD = 50;
// const PRESENCE_CHANNEL = "staff-presence";

// export default function StaffGroupChatScreen() {
//   const { user } = useAuthStore();
//   const { isDark } = useTheme(); // 👈 dark mode

//   const {
//     messages,
//     loading,
//     sending,
//     hasMore,
//     unreadCount,
//     sendMessage,
//     loadOlderMessages,
//     markAsRead,
//     editMessage,
//     deleteMessage,
//     addReaction,
//     removeReaction,
//   } = useOptimizedChat();

//   const [inputText, setInputText] = useState("");
//   const [isLoadingMore, setIsLoadingMore] = useState(false);
//   const [keyboardHeight, setKeyboardHeight] = useState(0);
//   const flatListRef = useRef<FlatList>(null);
//   const isNearLatestRef = useRef(true);
//   const inputRef = useRef<TextInput>(null);

//   const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

//   // Presence
//   const [onlineCount, setOnlineCount] = useState(0);
//   const [totalMembers, setTotalMembers] = useState(0);
//   const presenceChannelRef = useRef<any>(null);

//   // Keyboard
//   useEffect(() => {
//     const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
//       const inputBarHeight = 70;
//       const adjusted = e.endCoordinates.height - inputBarHeight;
//       setKeyboardHeight(adjusted > 0 ? adjusted : 0);
//     });
//     const hideSub = Keyboard.addListener("keyboardDidHide", () =>
//       setKeyboardHeight(0),
//     );
//     return () => {
//       showSub.remove();
//       hideSub.remove();
//     };
//   }, []);

//   // Fetch total members
//   useEffect(() => {
//     const fetchTotalMembers = async () => {
//       try {
//         const { count, error } = await supabase
//           .from("users")
//           .select("*", { count: "exact", head: true })
//           .in("role", ["dispatcher", "driver", "staff"]);
//         if (!error && count !== null) setTotalMembers(count);
//       } catch (e) {
//         /* ignore */
//       }
//     };
//     fetchTotalMembers();
//   }, []);

//   // Presence
//   useEffect(() => {
//     if (!user?.uid) return;
//     const channel = supabase.channel(PRESENCE_CHANNEL, {
//       config: { presence: { key: user.uid } },
//     });
//     channel
//       .on("presence", { event: "sync" }, () => {
//         const state = channel.presenceState();
//         const onlineUsers = Object.keys(state).filter((uid) => {
//           const data = state[uid] as any[];
//           return data?.some((p) => p.status === "online");
//         });
//         setOnlineCount(onlineUsers.length);
//       })
//       .subscribe(async (status) => {
//         if (status === "SUBSCRIBED") {
//           await channel.track({
//             user_id: user.uid,
//             display_name: user.displayName || "Staff",
//             status: "online",
//             last_seen: new Date().toISOString(),
//           });
//         }
//       });
//     presenceChannelRef.current = channel;
//     return () => {
//       if (channel) {
//         channel.untrack();
//         channel.unsubscribe();
//       }
//     };
//   }, [user?.uid]);

//   useEffect(() => {
//     const handleAppStateChange = (nextState: string) => {
//       if (presenceChannelRef.current && user?.uid) {
//         presenceChannelRef.current.track({
//           user_id: user.uid,
//           status: "online",
//           last_seen: new Date().toISOString(),
//         });
//       }
//     };
//     const subscription = AppState.addEventListener(
//       "change",
//       handleAppStateChange,
//     );
//     return () => subscription.remove();
//   }, [user?.uid]);

//   // Mark as read
//   useFocusEffect(
//     useCallback(() => {
//       if (unreadCount > 0) markAsRead();
//     }, [unreadCount, markAsRead]),
//   );

//   // Scroll
//   const handleScroll = useCallback(({ nativeEvent }: any) => {
//     const { contentOffset } = nativeEvent;
//     isNearLatestRef.current = contentOffset.y < NEAR_LATEST_THRESHOLD;
//   }, []);

//   const scrollToLatestIfNeeded = useCallback(() => {
//     if (isNearLatestRef.current && messages.length > 0) {
//       flatListRef.current?.scrollToIndex({ index: 0, animated: true });
//     }
//   }, [messages.length]);

//   // Edit handlers
//   const handleEditMessage = useCallback(
//     (messageId: string, currentText: string) => {
//       setEditingMessageId(messageId);
//       setInputText(currentText);
//       setTimeout(() => inputRef.current?.focus(), 100);
//     },
//     [],
//   );

//   const cancelEditing = useCallback(() => {
//     setEditingMessageId(null);
//     setInputText("");
//   }, []);

//   const handleUpdateMessage = useCallback(async () => {
//     if (!editingMessageId || !inputText.trim()) return;
//     try {
//       await editMessage(editingMessageId, inputText.trim());
//       cancelEditing();
//     } catch (error) {
//       console.error("Update failed:", error);
//     }
//   }, [editingMessageId, inputText, editMessage, cancelEditing]);

//   const handleSend = useCallback(async () => {
//     if (editingMessageId) {
//       await handleUpdateMessage();
//       return;
//     }
//     const trimmed = inputText.trim();
//     if (!trimmed || sending) return;
//     try {
//       await sendMessage(trimmed);
//       setInputText("");
//       if (isNearLatestRef.current) {
//         setTimeout(
//           () =>
//             flatListRef.current?.scrollToIndex({ index: 0, animated: true }),
//           100,
//         );
//       }
//     } catch (error) {
//       console.error("Send error:", error);
//     }
//   }, [inputText, sending, sendMessage, editingMessageId, handleUpdateMessage]);

//   // Pagination
//   const handleLoadMore = useCallback(async () => {
//     if (!hasMore || isLoadingMore) return;
//     setIsLoadingMore(true);
//     await loadOlderMessages();
//     setIsLoadingMore(false);
//   }, [hasMore, isLoadingMore, loadOlderMessages]);

//   // Data
//   const displayMessages = useMemo(() => [...messages].reverse(), [messages]);

//   const renderMessage = useCallback(
//     ({ item }: { item: (typeof messages)[0] }) => {
//       const isOwn = item.sender_id === user?.uid;
//       const readByOthers =
//         isOwn && item.read_by?.filter((id) => id !== user?.uid).length > 0;
//       return (
//         <OptimizedMessage
//           id={item.id}
//           message={item.message}
//           sender_id={item.sender_id}
//           created_at={item.created_at}
//           isOwn={isOwn}
//           senderName={item.sender?.display_name ?? "Staff"}
//           senderRole={item.sender?.role ?? "staff"}
//           senderAvatar={item.sender?.avatar_url}
//           read={readByOthers}
//           edited={!!item.edited_at}
//           deleted={!!item.deleted_at}
//           reactions={item.reactions || {}}
//           onEdit={handleEditMessage}
//           onDelete={deleteMessage}
//           onAddReaction={addReaction}
//           onRemoveReaction={removeReaction}
//           currentUserId={user?.uid}
//           isDark={isDark} // 👈 pass dark mode
//         />
//       );
//     },
//     [
//       user?.uid,
//       deleteMessage,
//       handleEditMessage,
//       addReaction,
//       removeReaction,
//       isDark,
//     ],
//   );

//   const UnreadBadge = () => {
//     if (unreadCount <= 0) return null;
//     return (
//       <View className="ml-2 bg-red-500 rounded-full min-w-[22px] h-[22px] items-center justify-center px-1">
//         <Text className="text-white text-xs font-bold">
//           {unreadCount > 99 ? "99+" : unreadCount}
//         </Text>
//       </View>
//     );
//   };

//   if (loading) {
//     return (
//       <SafeAreaView
//         className={`flex-1 items-center justify-center ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
//       >
//         <ActivityIndicator size="large" color="#0ea5e9" />
//         <Text
//           className={`mt-4 text-sm ${isDark ? "text-slate-400" : "text-slate-400"}`}
//         >
//           Loading messages...
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView
//       className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
//     >
//       {/* Header */}
//       <View
//         className={`px-4 py-3 border-b ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
//       >
//         <View className="flex-row items-center justify-between">
//           <Text
//             className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}
//           >
//             Staff Chat
//           </Text>
//           <UnreadBadge />
//         </View>
//         <View className="flex-row items-center mt-0.5">
//           <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
//           <Text
//             className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}
//           >
//             {onlineCount} online · {totalMembers} members
//           </Text>
//         </View>
//       </View>

//       {/* Chat list */}
//       <FlatList
//         ref={flatListRef}
//         data={displayMessages}
//         renderItem={renderMessage}
//         keyExtractor={(item) => item.id}
//         inverted
//         contentContainerStyle={{
//           paddingHorizontal: 12,
//           paddingBottom: 8,
//           paddingTop: 4,
//         }}
//         onEndReached={handleLoadMore}
//         onEndReachedThreshold={0.3}
//         removeClippedSubviews={Platform.OS === "android"}
//         windowSize={10}
//         maxToRenderPerBatch={10}
//         updateCellsBatchingPeriod={50}
//         keyboardShouldPersistTaps="handled"
//         onScroll={handleScroll}
//         onContentSizeChange={scrollToLatestIfNeeded}
//         ListFooterComponent={
//           isLoadingMore ? (
//             <View className="py-2 items-center">
//               <ActivityIndicator size="small" color="#94a3b8" />
//             </View>
//           ) : null
//         }
//         ListEmptyComponent={
//           <View className="flex-1 items-center justify-center py-20">
//             <Text className={isDark ? "text-slate-400" : "text-slate-400"}>
//               No messages yet. Say hello!
//             </Text>
//           </View>
//         }
//       />

//       {/* Input area */}
//       <View
//         className={`border-t ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
//       >
//         {editingMessageId && (
//           <View
//             className={`flex-row items-center justify-between px-3 py-1.5 ${isDark ? "bg-slate-700 border-slate-600" : "bg-blue-50 border-blue-100"} border-b`}
//           >
//             <Text
//               className={`text-sm ${isDark ? "text-sky-300" : "text-sky-600"}`}
//             >
//               Editing message
//             </Text>
//             <TouchableOpacity onPress={cancelEditing} className="p-1">
//               <X size={18} color={isDark ? "#94a3b8" : "#64748b"} />
//             </TouchableOpacity>
//           </View>
//         )}
//         <View className="px-3 py-2 flex-row items-end">
//           <TextInput
//             ref={inputRef}
//             className={`flex-1 rounded-full px-4 py-2 text-base max-h-24 ${
//               isDark ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-900"
//             }`}
//             placeholder={
//               editingMessageId ? "Edit your message..." : "Type a message..."
//             }
//             placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
//             value={inputText}
//             onChangeText={setInputText}
//             multiline
//             blurOnSubmit={false}
//             onSubmitEditing={handleSend}
//             returnKeyType="send"
//           />
//           <TouchableOpacity
//             onPress={handleSend}
//             disabled={!inputText.trim() || sending}
//             className={`ml-2 w-10 h-10 rounded-full items-center justify-center ${
//               !inputText.trim() || sending
//                 ? isDark
//                   ? "bg-slate-700"
//                   : "bg-slate-200"
//                 : editingMessageId
//                   ? "bg-emerald-500"
//                   : "bg-sky-500"
//             }`}
//           >
//             {sending ? (
//               <ActivityIndicator size="small" color="white" />
//             ) : editingMessageId ? (
//               <Check size={20} color="white" />
//             ) : (
//               <SendHorizontal size={20} color="white" />
//             )}
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Keyboard spacer */}
//       {keyboardHeight > 0 && <View style={{ height: keyboardHeight + 15 }} />}
//     </SafeAreaView>
//   );
// }
import { useFocusEffect } from "expo-router";
import { Check, MessageCircle, SendHorizontal, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OptimizedMessage } from "@/src/shared/components/chat/OptimizedMessage";
import { supabase } from "@/src/shared/config/supabase";
import { useTheme } from "@/src/shared/context/ThemeContext";
import { useOptimizedChat } from "@/src/shared/hooks/useOptimizedChat";
import { useAuthStore } from "@/src/shared/store/authStore";

const PRESENCE_CHANNEL = "staff-presence";
const BATCH_SIZE = 10;

export default function AdminChatScreen() {
  const { user } = useAuthStore();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const [onlineCount, setOnlineCount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const presenceChannelRef = useRef<any>(null);

  const isNearLatestRef = useRef(true);
  const initialScrollDoneRef = useRef(false);

  const colors = useMemo(
    () => ({
      background: isDark ? "#0F172A" : "#EEF8FF",
      surface: isDark ? "#172033" : "#FFFFFF",
      surfaceSoft: isDark ? "#1E293B" : "#F8FCFF",
      primary: "#0EA5E9",
      primaryDark: "#0284C7",
      primarySoft: isDark ? "#164E63" : "#E0F2FE",
      text: isDark ? "#F8FAFC" : "#0F172A",
      secondary: isDark ? "#CBD5E1" : "#475569",
      muted: isDark ? "#64748B" : "#94A3B8",
      border: isDark ? "#263449" : "#D8ECF7",
      input: isDark ? "#1E293B" : "#F8FCFF",
    }),
    [isDark],
  );

  useEffect(() => {
    if (!user?.uid) return;

    const fetchTotalMembers = async () => {
      const { count, error } = await supabase
        .from("users")
        .select("*", {
          count: "exact",
          head: true,
        })
        .in("role", ["dispatcher", "driver", "staff"]);

      if (!error && count !== null) {
        setTotalMembers(count);
      }
    };

    fetchTotalMembers();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: {
          key: user.uid,
        },
      },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();

      const onlineUsers = Object.keys(state).filter((uid) => {
        const presence = state[uid] as any[];

        return presence?.some((item) => item?.status === "online");
      });

      setOnlineCount(onlineUsers.length);
    });

    channel.subscribe(async (status) => {
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
      channel.untrack();
      channel.unsubscribe();
      presenceChannelRef.current = null;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const subscription = AppState.addEventListener(
      "change",
      async (nextState) => {
        const channel = presenceChannelRef.current;

        if (!channel) return;

        if (nextState === "active") {
          await channel.track({
            user_id: user.uid,
            display_name: user.displayName || "Staff",
            status: "online",
            last_seen: new Date().toISOString(),
          });
        }
      },
    );

    return () => subscription.remove();
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      if (unreadCount > 0) {
        markAsRead();
      }
    }, [unreadCount, markAsRead]),
  );

  const displayMessages = useMemo(() => [...messages].reverse(), [messages]);

  const scrollToLatest = useCallback(
    (animated = false) => {
      if (!displayMessages.length) return;

      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          index: 0,
          animated,
        });
      });
    },
    [displayMessages.length],
  );

  useEffect(() => {
    if (
      !loading &&
      displayMessages.length > 0 &&
      !initialScrollDoneRef.current
    ) {
      initialScrollDoneRef.current = true;

      setTimeout(() => {
        scrollToLatest(false);
      }, 50);
    }
  }, [loading, displayMessages.length, scrollToLatest]);

  const handleScroll = useCallback(({ nativeEvent }: any) => {
    isNearLatestRef.current = nativeEvent.contentOffset.y < 80;
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      await loadOlderMessages();
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loadOlderMessages]);

  const handleEditMessage = useCallback(
    (messageId: string, currentText: string) => {
      setEditingMessageId(messageId);
      setInputText(currentText);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
    },
    [],
  );

  const cancelEditing = useCallback(() => {
    setEditingMessageId(null);
    setInputText("");

    inputRef.current?.blur();
  }, []);

  const handleUpdateMessage = useCallback(async () => {
    if (!editingMessageId) return;

    const trimmed = inputText.trim();

    if (!trimmed) return;

    try {
      await editMessage(editingMessageId, trimmed);
      cancelEditing();
    } catch (error) {
      console.error("Failed to edit message:", error);
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
        setTimeout(() => {
          scrollToLatest(true);
        }, 80);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [
    editingMessageId,
    handleUpdateMessage,
    inputText,
    sending,
    sendMessage,
    scrollToLatest,
  ]);

  const renderMessage = useCallback(
    ({ item }: { item: (typeof messages)[number] }) => {
      const isOwn = item.sender_id === user?.uid;

      const readByOthers =
        isOwn && (item.read_by?.some((id) => id !== user?.uid) ?? false);

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
          isDark={isDark}
        />
      );
    },
    [
      messages,
      user?.uid,
      isDark,
      handleEditMessage,
      deleteMessage,
      addReaction,
      removeReaction,
    ],
  );

  const renderHeader = () => (
    <View
      style={{
        paddingTop: Math.max(insets.top, 10),
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        shadowColor: "#38BDF8",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: isDark ? 0.15 : 0.1,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 20,
      }}
    >
      <View
        className="flex-row items-center"
        style={{
          paddingHorizontal: 16,
          paddingBottom: 12,
          paddingTop: 6,
        }}
      >
        <View
          className="items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 17,
            backgroundColor: colors.primarySoft,
            shadowColor: "#38BDF8",
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.14,
            shadowRadius: 7,
            elevation: 3,
          }}
        >
          <MessageCircle
            size={23}
            color={colors.primaryDark}
            strokeWidth={2.4}
          />
        </View>

        <View
          className="flex-1"
          style={{
            marginLeft: 11,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 19,
              fontWeight: "800",
            }}
          >
            Staff Chat
          </Text>

          <View
            className="flex-row items-center"
            style={{
              marginTop: 3,
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: "#22C55E",
                marginRight: 6,
              }}
            />

            <Text
              style={{
                color: colors.secondary,
                fontSize: 11,
                fontWeight: "600",
              }}
            >
              {onlineCount} online · {totalMembers} members
            </Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <Pressable
            onPress={markAsRead}
            className="items-center justify-center"
            style={{
              minWidth: 38,
              height: 30,
              paddingHorizontal: 9,
              borderRadius: 15,
              backgroundColor: "#EF4444",
              shadowColor: "#EF4444",
              shadowOffset: {
                width: 0,
                height: 3,
              },
              shadowOpacity: 0.2,
              shadowRadius: 5,
              elevation: 3,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 11,
                fontWeight: "900",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  if (loading && messages.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{
          backgroundColor: colors.background,
          paddingTop: insets.top,
        }}
      >
        <View
          className="items-center justify-center"
          style={{
            width: 150,
            height: 130,
            borderRadius: 30,
            backgroundColor: colors.surface,
            shadowColor: "#38BDF8",
            shadowOffset: {
              width: 0,
              height: 8,
            },
            shadowOpacity: 0.18,
            shadowRadius: 15,
            elevation: 6,
          }}
        >
          <ActivityIndicator size="large" color={colors.primaryDark} />

          <Text
            style={{
              marginTop: 12,
              color: colors.secondary,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            Loading chat...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        {renderHeader()}

        <FlatList
          ref={flatListRef}
          data={displayMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          removeClippedSubviews={Platform.OS === "android"}
          initialNumToRender={BATCH_SIZE}
          maxToRenderPerBatch={BATCH_SIZE}
          updateCellsBatchingPeriod={40}
          windowSize={5}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 14,
            paddingBottom: 18,
          }}
          ListFooterComponent={
            isLoadingMore ? (
              <View
                className="items-center justify-center"
                style={{
                  paddingVertical: 12,
                }}
              >
                <ActivityIndicator size="small" color={colors.primaryDark} />

                <Text
                  style={{
                    marginTop: 5,
                    color: colors.muted,
                    fontSize: 10,
                    fontWeight: "600",
                  }}
                >
                  Loading older messages...
                </Text>
              </View>
            ) : hasMore ? (
              <View
                className="items-center justify-center"
                style={{
                  paddingVertical: 8,
                }}
              >
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 10,
                    fontWeight: "600",
                  }}
                >
                  Scroll up for older messages
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View
              className="items-center justify-center"
              style={{
                minHeight: 280,
              }}
            >
              <View
                className="items-center justify-center"
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 28,
                  backgroundColor: colors.primarySoft,
                  shadowColor: "#38BDF8",
                  shadowOffset: {
                    width: 0,
                    height: 7,
                  },
                  shadowOpacity: 0.17,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <MessageCircle
                  size={40}
                  color={colors.primaryDark}
                  strokeWidth={1.8}
                />
              </View>

              <Text
                style={{
                  marginTop: 16,
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                No messages yet
              </Text>

              <Text
                style={{
                  marginTop: 5,
                  color: colors.secondary,
                  fontSize: 12,
                  fontWeight: "500",
                }}
              >
                Start a conversation with the staff.
              </Text>
            </View>
          }
        />

        <View
          style={{
            backgroundColor: colors.background,
            paddingHorizontal: 12,
            paddingTop: 7,
            paddingBottom:
              Platform.OS === "ios" ? Math.max(insets.bottom, 8) : 8,
          }}
        >
          {editingMessageId && (
            <View
              className="flex-row items-center"
              style={{
                minHeight: 40,
                paddingHorizontal: 13,
                marginBottom: 7,
                borderRadius: 15,
                backgroundColor: colors.primarySoft,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: "#38BDF8",
                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View
                style={{
                  width: 4,
                  height: 23,
                  borderRadius: 4,
                  backgroundColor: colors.primary,
                  marginRight: 9,
                }}
              />

              <View className="flex-1">
                <Text
                  style={{
                    color: colors.primaryDark,
                    fontSize: 10,
                    fontWeight: "800",
                  }}
                >
                  EDITING MESSAGE
                </Text>

                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 1,
                    color: colors.secondary,
                    fontSize: 11,
                  }}
                >
                  Update your message
                </Text>
              </View>

              <Pressable
                onPress={cancelEditing}
                className="items-center justify-center"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  backgroundColor: colors.surface,
                }}
              >
                <X size={16} color={colors.secondary} />
              </Pressable>
            </View>
          )}

          <View
            className="flex-row items-end"
            style={{
              minHeight: 58,
              maxHeight: 130,
              borderRadius: 22,
              paddingLeft: 15,
              paddingRight: 7,
              paddingVertical: 7,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: "#38BDF8",
              shadowOffset: {
                width: 0,
                height: 5,
              },
              shadowOpacity: isDark ? 0.12 : 0.16,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <TextInput
              ref={inputRef}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                editingMessageId ? "Edit your message..." : "Message staff..."
              }
              placeholderTextColor={colors.muted}
              multiline
              maxLength={2000}
              blurOnSubmit={false}
              editable={!sending}
              style={{
                flex: 1,
                maxHeight: 105,
                minHeight: 42,
                paddingTop: 10,
                paddingBottom: 8,
                paddingRight: 8,
                color: colors.text,
                fontSize: 14,
                lineHeight: 20,
              }}
              onSubmitEditing={handleSend}
            />

            <View
              className="items-end justify-end"
              style={{
                marginBottom: 1,
              }}
            >
              <Text
                style={{
                  marginBottom: 3,
                  marginRight: 3,
                  color: colors.muted,
                  fontSize: 8,
                  fontWeight: "600",
                }}
              >
                {inputText.length}/2000
              </Text>

              <Pressable
                onPress={handleSend}
                disabled={!inputText.trim() || sending}
                className="items-center justify-center"
                style={{
                  width: 43,
                  height: 43,
                  borderRadius: 15,
                  backgroundColor:
                    !inputText.trim() || sending
                      ? isDark
                        ? "#334155"
                        : "#CBD5E1"
                      : editingMessageId
                        ? "#16A34A"
                        : colors.primaryDark,
                  shadowColor: editingMessageId ? "#16A34A" : "#0284C7",
                  shadowOffset: {
                    width: 0,
                    height: 4,
                  },
                  shadowOpacity: !inputText.trim() || sending ? 0 : 0.25,
                  shadowRadius: 7,
                  elevation: !inputText.trim() || sending ? 0 : 4,
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : editingMessageId ? (
                  <Check size={19} color="#FFFFFF" strokeWidth={2.8} />
                ) : (
                  <SendHorizontal size={19} color="#FFFFFF" strokeWidth={2.5} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
