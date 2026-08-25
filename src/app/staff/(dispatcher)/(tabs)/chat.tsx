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

export default function DispatcherChatScreen() {
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
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

      surfaceSoft: isDark ? "#1E293B" : "#F7FBFE",

      primary: "#0EA5E9",

      primaryDark: "#0284C7",

      primarySoft: isDark ? "#164E63" : "#E0F2FE",

      text: isDark ? "#F8FAFC" : "#0F172A",

      secondary: isDark ? "#CBD5E1" : "#475569",

      muted: isDark ? "#64748B" : "#94A3B8",

      border: isDark ? "#263449" : "#D9EAF4",

      success: "#22C55E",

      danger: "#EF4444",
    }),
    [isDark],
  );

  /*
   * LOAD TOTAL STAFF MEMBERS
   */
  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;

    const loadMembers = async () => {
      try {
        const { count, error } = await supabase
          .from("users")
          .select("*", {
            count: "exact",
            head: true,
          })
          .in("role", ["admin", "dispatcher", "driver", "staff"]);

        if (error) {
          console.error("Failed to load members:", error);
          return;
        }

        if (!cancelled && count !== null) {
          setTotalMembers(count);
        }
      } catch (error) {
        console.error("Load members error:", error);
      }
    };

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  /*
   * STAFF PRESENCE
   */
  useEffect(() => {
    if (!user?.uid) return;

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: {
          key: user.uid,
        },
      },
    });

    channel.on(
      "presence",
      {
        event: "sync",
      },
      () => {
        const state = channel.presenceState();

        let count = 0;

        Object.keys(state).forEach((key) => {
          const entries = state[key] as any[];

          if (entries?.some((entry) => entry?.status === "online")) {
            count++;
          }
        });

        setOnlineCount(count);
      },
    );

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.track({
            user_id: user.uid,
            display_name: user.displayName || "Staff",
            status: "online",
            last_seen: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Presence track error:", error);
        }
      }
    });

    presenceChannelRef.current = channel;

    return () => {
      try {
        channel.untrack();
        channel.unsubscribe();
      } catch {}

      presenceChannelRef.current = null;
    };
  }, [user?.uid, user?.displayName]);

  /*
   * RE-TRACK PRESENCE
   */
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextState) => {
        const channel = presenceChannelRef.current;

        if (!channel || !user?.uid) {
          return;
        }

        if (nextState === "active") {
          try {
            await channel.track({
              user_id: user.uid,
              display_name: user.displayName || "Staff",
              status: "online",
              last_seen: new Date().toISOString(),
            });
          } catch {}
        }
      },
    );

    return () => subscription.remove();
  }, [user?.uid, user?.displayName]);

  /*
   * MARK READ
   */
  useFocusEffect(
    useCallback(() => {
      if (unreadCount > 0) {
        markAsRead();
      }
    }, [unreadCount, markAsRead]),
  );

  /*
   * DISPLAY ORDER
   */
  const displayMessages = useMemo(() => [...messages].reverse(), [messages]);

  /*
   * SCROLL TO LATEST
   */
  const scrollToLatest = useCallback(
    (animated = false) => {
      if (!displayMessages.length) {
        return;
      }

      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          index: 0,
          animated,
        });
      });
    },
    [displayMessages.length],
  );

  /*
   * INITIAL SCROLL
   */
  useEffect(() => {
    if (
      !loading &&
      displayMessages.length > 0 &&
      !initialScrollDoneRef.current
    ) {
      initialScrollDoneRef.current = true;

      setTimeout(() => {
        scrollToLatest(false);
      }, 80);
    }
  }, [loading, displayMessages.length, scrollToLatest]);

  /*
   * TRACK LATEST POSITION
   */
  const handleScroll = useCallback(({ nativeEvent }: any) => {
    isNearLatestRef.current = nativeEvent.contentOffset.y < 80;
  }, []);

  /*
   * LOAD OLDER
   */
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      await loadOlderMessages();
    } catch (error) {
      console.error("Load older messages error:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loadOlderMessages]);

  /*
   * EDIT
   */
  const handleEditMessage = useCallback(
    (messageId: string, currentText: string) => {
      setEditingMessageId(messageId);
      setInputText(currentText);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    },
    [],
  );

  /*
   * CANCEL EDIT
   */
  const cancelEditing = useCallback(() => {
    setEditingMessageId(null);
    setInputText("");
    inputRef.current?.blur();
  }, []);

  /*
   * UPDATE
   */
  const handleUpdateMessage = useCallback(async () => {
    if (!editingMessageId) {
      return;
    }

    const text = inputText.trim();

    if (!text) {
      return;
    }

    await editMessage(editingMessageId, text);

    cancelEditing();
  }, [editingMessageId, inputText, editMessage, cancelEditing]);

  /*
   * SEND
   */
  const handleSend = useCallback(async () => {
    if (editingMessageId) {
      await handleUpdateMessage();
      return;
    }

    const text = inputText.trim();

    if (!text || sending) {
      return;
    }

    await sendMessage(text);

    setInputText("");

    if (isNearLatestRef.current) {
      setTimeout(() => {
        scrollToLatest(true);
      }, 100);
    }
  }, [
    editingMessageId,
    inputText,
    sending,
    sendMessage,
    handleUpdateMessage,
    scrollToLatest,
  ]);

  /*
   * DELETE
   */
  const handleDelete = useCallback(
    async (messageId: string) => {
      try {
        await deleteMessage(messageId);
      } catch (error) {
        console.error("Delete message error:", error);
      }
    },
    [deleteMessage],
  );

  /*
   * MESSAGE
   */
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
          onDelete={handleDelete}
          onAddReaction={addReaction}
          onRemoveReaction={removeReaction}
          currentUserId={user?.uid}
          isDark={isDark}
        />
      );
    },
    [
      user?.uid,
      isDark,
      handleEditMessage,
      handleDelete,
      addReaction,
      removeReaction,
    ],
  );

  /*
   * LOADING
   */
  if (loading && !messages.length) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            width: 70,
            height: 70,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surface,
            shadowColor: "#38BDF8",
            shadowOffset: {
              width: 0,
              height: 6,
            },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <MessageCircle size={31} color={colors.primaryDark} />
        </View>

        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{
            marginTop: 18,
          }}
        />

        <Text
          style={{
            marginTop: 10,
            color: colors.secondary,
            fontWeight: "700",
          }}
        >
          Loading staff chat...
        </Text>
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
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        {/* HEADER */}

        <View
          style={{
            paddingTop: Math.max(insets.top, 10),
            paddingBottom: 11,
            paddingHorizontal: 14,

            backgroundColor: isDark ? "#172033" : "#DFF3FC",

            borderBottomWidth: 1,
            borderBottomColor: colors.border,

            shadowColor: "#38BDF8",
            shadowOffset: {
              width: 0,
              height: 5,
            },
            shadowOpacity: isDark ? 0.08 : 0.12,
            shadowRadius: 10,

            elevation: 8,

            zIndex: 30,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 49,
                height: 49,
                borderRadius: 17,

                alignItems: "center",
                justifyContent: "center",

                backgroundColor: isDark ? "#203047" : "#EAF7FF",

                borderWidth: 1,
                borderColor: isDark ? "#2D415A" : "#D6EDF9",

                shadowColor: "#38BDF8",
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                shadowOpacity: 0.16,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <MessageCircle
                size={24}
                color={colors.primaryDark}
                strokeWidth={2.5}
              />
            </View>

            <View
              style={{
                flex: 1,
                marginLeft: 11,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: "900",
                  letterSpacing: -0.3,
                }}
              >
                Staff Chat
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: colors.success,
                    marginRight: 5,
                  }}
                />

                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.secondary,
                    fontSize: 10,
                    fontWeight: "700",
                  }}
                >
                  {onlineCount} online
                  {" · "}
                  {totalMembers} members
                </Text>
              </View>
            </View>

            {unreadCount > 0 && (
              <View
                style={{
                  marginRight: 7,
                  minWidth: 29,
                  height: 29,
                  borderRadius: 15,
                  paddingHorizontal: 7,

                  alignItems: "center",
                  justifyContent: "center",

                  backgroundColor: colors.danger,

                  shadowColor: colors.danger,
                  shadowOffset: {
                    width: 0,
                    height: 3,
                  },
                  shadowOpacity: 0.18,
                  shadowRadius: 5,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: "900",
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* MESSAGES */}

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
                style={{
                  alignItems: "center",
                  paddingVertical: 12,
                }}
              >
                <ActivityIndicator size="small" color={colors.primary} />

                <Text
                  style={{
                    marginTop: 5,
                    color: colors.muted,
                    fontSize: 10,
                  }}
                >
                  Loading older messages...
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                minHeight: 280,
              }}
            >
              <View
                style={{
                  width: 85,
                  height: 85,
                  borderRadius: 28,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.surface,

                  shadowColor: "#38BDF8",
                  shadowOffset: {
                    width: 0,
                    height: 6,
                  },
                  shadowOpacity: 0.12,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <MessageCircle size={38} color={colors.primaryDark} />
              </View>

              <Text
                style={{
                  marginTop: 15,
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
                }}
              >
                Start a conversation.
              </Text>
            </View>
          }
        />

        {/* EDIT BAR */}

        {editingMessageId && (
          <View
            style={{
              marginHorizontal: 12,
              marginBottom: 6,
              paddingHorizontal: 12,
              height: 42,
              borderRadius: 15,

              flexDirection: "row",
              alignItems: "center",

              backgroundColor: colors.surface,

              borderWidth: 1,
              borderColor: colors.border,

              shadowColor: "#38BDF8",
              shadowOffset: {
                width: 0,
                height: 3,
              },
              shadowOpacity: 0.08,
              shadowRadius: 7,
              elevation: 3,
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

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={{
                  color: colors.primaryDark,
                  fontSize: 9,
                  fontWeight: "900",
                }}
              >
                EDITING MESSAGE
              </Text>

              <Text
                style={{
                  color: colors.secondary,
                  fontSize: 10,
                }}
              >
                Update your message
              </Text>
            </View>

            <Pressable
              onPress={cancelEditing}
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,

                alignItems: "center",
                justifyContent: "center",

                backgroundColor: colors.surfaceSoft,
              }}
            >
              <X size={16} color={colors.secondary} />
            </Pressable>
          </View>
        )}

        {/* INPUT */}

        <View
          style={{
            paddingHorizontal: 12,
            paddingTop: 7,
            paddingBottom:
              Platform.OS === "ios" ? Math.max(insets.bottom, 8) : 8,

            backgroundColor: colors.background,
          }}
        >
          <View
            style={{
              minHeight: 58,
              maxHeight: 130,
              borderRadius: 22,

              paddingLeft: 15,
              paddingRight: 7,
              paddingVertical: 7,

              flexDirection: "row",
              alignItems: "flex-end",

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
                editingMessageId ? "Edit message..." : "Message staff..."
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
            />

            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
              style={{
                width: 43,
                height: 43,
                borderRadius: 15,

                alignItems: "center",
                justifyContent: "center",

                backgroundColor:
                  !inputText.trim() || sending
                    ? "#CBD5E1"
                    : editingMessageId
                      ? "#16A34A"
                      : colors.primaryDark,

                shadowColor:
                  !inputText.trim() || sending ? "#64748B" : colors.primaryDark,

                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                shadowOpacity: 0.16,
                shadowRadius: 5,
                elevation: 3,
              }}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : editingMessageId ? (
                <Check size={19} color="#FFF" strokeWidth={2.8} />
              ) : (
                <SendHorizontal size={19} color="#FFF" strokeWidth={2.5} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
