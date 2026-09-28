import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  MessageCircle,
  MoreVertical,
  SendHorizontal,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
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

interface PendingAttachment {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

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
    adminDeleteMessage,

    addReaction,
    removeReaction,
  } = useOptimizedChat();

  const [inputText, setInputText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [attaching, setAttaching] = useState(false);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);

  const [adminMenuVisible, setAdminMenuVisible] = useState(false);
  const [memberModalVisible, setMemberModalVisible] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const presenceChannelRef = useRef<any>(null);

  const isNearLatestRef = useRef(true);
  const initialScrollDoneRef = useRef(false);

  const isAdmin = user?.role?.toLowerCase() === "admin";

  /*
   * CLAYMORPHISM COLORS
   *
   * The header intentionally uses the same clay surface
   * as the rest of the interface instead of a blue header.
   */
  const colors = useMemo(
    () => ({
      background: isDark ? "#0F172A" : "#EEF8FF",

      surface: isDark ? "#172033" : "#FFFFFF",

      surfaceSoft: isDark ? "#1E293B" : "#F7FBFE",

      surfaceRaised: isDark ? "#202D42" : "#FDFEFF",

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
   * RE-TRACK PRESENCE WHEN APP RETURNS
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
   * MARK CHAT AS READ WHEN SCREEN IS FOCUSED
   */
  useFocusEffect(
    useCallback(() => {
      if (unreadCount > 0) {
        markAsRead();
      }
    }, [unreadCount, markAsRead]),
  );

  /*
   * CHAT DATA
   *
   * The hook keeps messages oldest -> newest.
   * FlatList inverted therefore displays newest at the bottom.
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
   * TRACK WHETHER USER IS NEAR THE LATEST MESSAGE
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
      setAttachment(null);
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
   * UPDATE MESSAGE
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
   * PICK IMAGE
   */
  const handlePickImage = useCallback(async () => {
    if (editingMessageId || attaching || sending) {
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        console.warn("⚠️ Media library permission was not granted.");
        return;
      }

      setAttaching(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];

      setAttachment({
        uri: asset.uri,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileName: asset.fileName ?? undefined,
      });
    } catch (error) {
      console.error("Image pick error:", error);
    } finally {
      setAttaching(false);
    }
  }, [editingMessageId, attaching, sending]);

  const clearAttachment = useCallback(() => {
    setAttachment(null);
  }, []);

  /*
   * SEND MESSAGE
   */
  const handleSend = useCallback(async () => {
    if (editingMessageId) {
      await handleUpdateMessage();
      return;
    }

    const text = inputText.trim();

    if ((!text && !attachment) || sending) {
      return;
    }

    try {
      await sendMessage(text, attachment ?? undefined);

      setInputText("");
      setAttachment(null);

      if (isNearLatestRef.current) {
        setTimeout(() => {
          scrollToLatest(true);
        }, 100);
      }
    } catch (error) {
      console.error("Send message error:", error);
    }
  }, [
    editingMessageId,
    inputText,
    attachment,
    sending,
    sendMessage,
    handleUpdateMessage,
    scrollToLatest,
  ]);

  /*
   * DELETE / ADMIN DELETE
   *
   * Uses the custom clay confirmation modal below instead of
   * React Native Alert.alert().
   */
  const handleDelete = useCallback((messageId: string) => {
    setDeleteMessageId(messageId);
    setDeleteError(null);
    setDeleteModalVisible(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (deleteBusy) return;
    setDeleteModalVisible(false);
    setDeleteMessageId(null);
    setDeleteError(null);
  }, [deleteBusy]);

  const confirmDeleteMessage = useCallback(async () => {
    if (!deleteMessageId || deleteBusy) return;

    setDeleteBusy(true);
    setDeleteError(null);

    try {
      if (isAdmin && typeof adminDeleteMessage === "function") {
        await adminDeleteMessage(deleteMessageId);
      } else {
        await deleteMessage(deleteMessageId);
      }

      setDeleteModalVisible(false);
      setDeleteMessageId(null);
    } catch (error) {
      console.error("Delete message error:", error);
      setDeleteError("You do not have permission to delete this message.");
    } finally {
      setDeleteBusy(false);
    }
  }, [deleteMessageId, deleteBusy, isAdmin, adminDeleteMessage, deleteMessage]);

  /*
   * RENDER MESSAGE
   *
   * No formattedTime prop is passed here.
   * OptimizedMessage calculates the Philippine 12-hour
   * timestamp itself.
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
          attachment_url={item.attachment_url ?? undefined}
          attachment_type={item.attachment_type ?? undefined}
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
   * LOADING SCREEN
   */
  if (loading && !messages.length) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{
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

  const sendDisabled = (!inputText.trim() && !attachment) || sending;

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
        {/* ====================================================== */}
        {/* CLAY HEADER */}
        {/* ====================================================== */}

        <View
          style={{
            paddingTop: Math.max(insets.top, 10),
            paddingBottom: 11,
            paddingHorizontal: 14,

            /*
             * IMPORTANT:
             * Header is now clay white/gray instead
             * of blue.
             */
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
          <View className="flex-row items-center">
            {/* CHAT ICON */}

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
              <Pressable
                onPress={() => router.back()}
                className="h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-white/80"
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ArrowLeft
                  size={19}
                  color={colors.primaryDark}
                  strokeWidth={2.5}
                />
              </Pressable>
            </View>

            {/* CHAT TITLE */}

            <View
              className="flex-1"
              style={{
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
                className="flex-row items-center"
                style={{
                  marginTop: 2,
                }}
              >
                {/* ONLINE DOT */}

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

            {/* UNREAD */}

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

            {/* ADMIN BUTTON */}

            {isAdmin && (
              <Pressable
                onPress={() => setAdminMenuVisible(true)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,

                  alignItems: "center",
                  justifyContent: "center",

                  backgroundColor: colors.surface,

                  borderWidth: 1,
                  borderColor: colors.border,

                  shadowColor: "#64748B",
                  shadowOffset: {
                    width: 0,
                    height: 3,
                  },
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <MoreVertical size={21} color={colors.secondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ====================================================== */}
        {/* MESSAGES */}
        {/* ====================================================== */}

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
                className="items-center"
                style={{
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
              className="items-center justify-center"
              style={{
                minHeight: 280,
              }}
            >
              <View
                className="items-center justify-center"
                style={{
                  width: 85,
                  height: 85,
                  borderRadius: 28,
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

        {/* ====================================================== */}
        {/* EDIT BAR */}
        {/* ====================================================== */}

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

            <View className="flex-1">
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

        {/* ====================================================== */}
        {/* ATTACHMENT PREVIEW */}
        {/* ====================================================== */}

        {attachment && !editingMessageId && (
          <View
            style={{
              marginHorizontal: 12,
              marginBottom: 6,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 16,

              flexDirection: "row",
              alignItems: "center",

              backgroundColor: colors.surface,

              borderWidth: 1,
              borderColor: colors.border,

              shadowColor: "#38BDF8",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.08,
              shadowRadius: 7,
              elevation: 3,
            }}
          >
            <Image
              source={{ uri: attachment.uri }}
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
              }}
              resizeMode="cover"
            />

            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={{
                  color: colors.primaryDark,
                  fontSize: 9,
                  fontWeight: "900",
                }}
              >
                IMAGE ATTACHED
              </Text>

              <Text
                numberOfLines={1}
                style={{
                  color: colors.secondary,
                  fontSize: 10,
                  marginTop: 2,
                }}
              >
                {attachment.fileName || "photo.jpg"}
              </Text>
            </View>

            <Pressable
              onPress={clearAttachment}
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

        {/* ====================================================== */}
        {/* INPUT */}
        {/* ====================================================== */}

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
            className="flex-row items-end"
            style={{
              minHeight: 58,
              maxHeight: 130,
              borderRadius: 22,

              paddingLeft: 7,
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
            <Pressable
              onPress={handlePickImage}
              disabled={!!editingMessageId || attaching || sending}
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                alignSelf: "flex-end",
                marginBottom: 1,

                alignItems: "center",
                justifyContent: "center",

                backgroundColor: colors.surfaceSoft,
                opacity: editingMessageId ? 0.4 : 1,
              }}
            >
              {attaching ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <ImagePlus size={19} color={colors.primaryDark} />
              )}
            </Pressable>

            <TextInput
              ref={inputRef}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                editingMessageId
                  ? "Edit message..."
                  : attachment
                    ? "Add a caption..."
                    : "Message staff..."
              }
              placeholderTextColor={colors.muted}
              multiline
              maxLength={2000}
              blurOnSubmit={false}
              editable={!sending}
              style={{
                flex: 1,
                marginLeft: 8,
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
              disabled={sendDisabled}
              style={{
                width: 43,
                height: 43,
                borderRadius: 15,

                alignItems: "center",
                justifyContent: "center",

                backgroundColor: sendDisabled
                  ? "#CBD5E1"
                  : editingMessageId
                    ? "#16A34A"
                    : colors.primaryDark,

                shadowColor: sendDisabled ? "#64748B" : colors.primaryDark,

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

        {/* ====================================================== */}
        {/* CLAY UNSEND CONFIRMATION */}
        {/* ====================================================== */}

        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeDeleteModal}
        >
          <Pressable
            onPress={closeDeleteModal}
            style={{
              flex: 1,
              backgroundColor: "rgba(15,23,42,0.48)",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            }}
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 360,
                borderRadius: 30,
                padding: 7,
                backgroundColor: isDark ? "#164E63" : "#EAF9FE",
                borderWidth: 1,
                borderColor: isDark ? "#286B82" : "#C4E4EF",
                shadowColor: isDark ? "#000000" : "#43B9E8",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: isDark ? 0.35 : 0.22,
                shadowRadius: 20,
                elevation: 14,
              }}
            >
              <View
                style={{
                  borderRadius: 24,
                  padding: 20,
                  backgroundColor: isDark ? "#12536A" : "#F4FCFF",
                  borderWidth: 1,
                  borderColor: isDark ? "#1C6078" : "#D5EEF7",
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 21,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isDark ? "#713B3B" : "#FDECEC",
                      shadowColor: "#EF4444",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 7,
                      elevation: 4,
                    }}
                  >
                    <Trash2 size={28} color="#EF4444" strokeWidth={2.4} />
                  </View>

                  <Text
                    style={{
                      marginTop: 15,
                      color: isDark ? "#FFFFFF" : "#17445A",
                      fontSize: 19,
                      fontWeight: "900",
                      textAlign: "center",
                    }}
                  >
                    {isAdmin ? "Unsend message?" : "Delete message?"}
                  </Text>

                  <Text
                    style={{
                      marginTop: 7,
                      color: isDark ? "#B9D9E5" : "#477386",
                      fontSize: 13,
                      lineHeight: 20,
                      fontWeight: "500",
                      textAlign: "center",
                    }}
                  >
                    {deleteError ||
                      (isAdmin
                        ? "This message will be removed from the chat for everyone."
                        : "This message will be removed from your chat.")}
                  </Text>

                  <View
                    style={{
                      width: "100%",
                      flexDirection: "row",
                      gap: 10,
                      marginTop: 20,
                    }}
                  >
                    <Pressable
                      onPress={closeDeleteModal}
                      disabled={deleteBusy}
                      style={{
                        flex: 1,
                        minHeight: 48,
                        borderRadius: 17,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isDark ? "#1D6078" : "#DDF4FC",
                        borderWidth: 1,
                        borderColor: isDark ? "#2A7891" : "#C4E4EF",
                        opacity: deleteBusy ? 0.55 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: isDark ? "#D8F3FC" : "#167BAA",
                          fontSize: 13,
                          fontWeight: "800",
                        }}
                      >
                        Cancel
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={confirmDeleteMessage}
                      disabled={deleteBusy}
                      style={{
                        flex: 1,
                        minHeight: 48,
                        borderRadius: 17,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: deleteBusy ? "#8ADBF4" : "#43B9E8",
                        shadowColor: "#167BAA",
                        shadowOffset: { width: 0, height: 5 },
                        shadowOpacity: 0.22,
                        shadowRadius: 8,
                        elevation: 5,
                      }}
                    >
                      {deleteBusy ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 13,
                            fontWeight: "900",
                          }}
                        >
                          {isAdmin ? "Unsend" : "Delete"}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ====================================================== */}
        {/* ADMIN MENU */}
        {/* ====================================================== */}

        <Modal
          visible={adminMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAdminMenuVisible(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(15,23,42,0.45)",

              justifyContent: "flex-start",
              alignItems: "flex-end",

              paddingTop: insets.top + 58,
              paddingRight: 14,
            }}
            onPress={() => setAdminMenuVisible(false)}
          >
            <Pressable
              onPress={() => {}}
              style={{
                width: 235,
                borderRadius: 24,
                padding: 10,

                backgroundColor: colors.surface,

                borderWidth: 1,
                borderColor: colors.border,

                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 10,
                },
                shadowOpacity: 0.18,
                shadowRadius: 20,
                elevation: 12,
              }}
            >
              {/* MENU HEADER */}

              <View
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 8,
                }}
              >
                <View className="flex-row items-center">
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 11,

                      alignItems: "center",
                      justifyContent: "center",

                      backgroundColor: colors.primarySoft,
                    }}
                  >
                    <Shield size={17} color={colors.primaryDark} />
                  </View>

                  <View
                    style={{
                      marginLeft: 9,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 13,
                        fontWeight: "900",
                      }}
                    >
                      Admin Controls
                    </Text>

                    <Text
                      style={{
                        color: colors.muted,
                        fontSize: 9,
                      }}
                    >
                      Staff chat management
                    </Text>
                  </View>
                </View>
              </View>

              {/* MEMBERS */}

              <Pressable
                onPress={() => {
                  setAdminMenuVisible(false);

                  setMemberModalVisible(true);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",

                  padding: 12,
                  borderRadius: 15,

                  backgroundColor: colors.surfaceSoft,

                  marginTop: 3,
                }}
              >
                <Users size={18} color={colors.primaryDark} />

                <View
                  style={{
                    marginLeft: 11,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    Manage Members
                  </Text>

                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 9,
                    }}
                  >
                    {totalMembers} staff members
                  </Text>
                </View>
              </Pressable>

              {/* OVERVIEW */}

              <Pressable
                onPress={() => setAdminMenuVisible(false)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",

                  padding: 12,
                  borderRadius: 15,

                  marginTop: 5,
                }}
              >
                <MessageCircle size={18} color={colors.secondary} />

                <View
                  style={{
                    marginLeft: 11,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    Chat Overview
                  </Text>

                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 9,
                    }}
                  >
                    {onlineCount} staff currently online
                  </Text>
                </View>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ====================================================== */}
        {/* MEMBERS MODAL */}
        {/* ====================================================== */}

        <Modal
          visible={memberModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setMemberModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",

              backgroundColor: "rgba(15,23,42,0.45)",
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,

                borderTopLeftRadius: 30,
                borderTopRightRadius: 30,

                paddingTop: 8,
                paddingHorizontal: 18,

                paddingBottom: Math.max(insets.bottom, 18),

                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: -8,
                },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 15,
              }}
            >
              {/* HANDLE */}

              <View
                style={{
                  alignSelf: "center",
                  width: 40,
                  height: 4,
                  borderRadius: 4,

                  backgroundColor: colors.border,

                  marginBottom: 18,
                }}
              />

              {/* TITLE */}

              <View className="flex-row items-center">
                <View
                  style={{
                    width: 45,
                    height: 45,
                    borderRadius: 15,

                    alignItems: "center",
                    justifyContent: "center",

                    backgroundColor: colors.primarySoft,
                  }}
                >
                  <Users size={22} color={colors.primaryDark} />
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
                      fontSize: 18,
                      fontWeight: "900",
                    }}
                  >
                    Staff Members
                  </Text>

                  <Text
                    style={{
                      color: colors.secondary,
                      fontSize: 11,
                    }}
                  >
                    {onlineCount} online
                    {" · "}
                    {totalMembers} total
                  </Text>
                </View>

                <Pressable
                  onPress={() => setMemberModalVisible(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,

                    alignItems: "center",
                    justifyContent: "center",

                    backgroundColor: colors.surfaceSoft,
                  }}
                >
                  <X size={18} color={colors.secondary} />
                </Pressable>
              </View>

              {/* ADMIN INFO */}

              <View
                style={{
                  marginTop: 18,
                  padding: 15,
                  borderRadius: 18,

                  backgroundColor: colors.primarySoft,
                }}
              >
                <Text
                  style={{
                    color: colors.primaryDark,
                    fontSize: 11,
                    fontWeight: "800",
                  }}
                >
                  ADMIN ACCESS
                </Text>

                <Text
                  style={{
                    marginTop: 4,
                    color: colors.secondary,
                    fontSize: 11,
                    lineHeight: 17,
                  }}
                >
                  As an administrator, you can manage chat messages and staff
                  participation.
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}
