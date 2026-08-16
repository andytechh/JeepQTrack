import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useOptimizedChat } from "../../../../src/shared/hooks/useOptimizedChat";
import { useAuthStore } from "../../../../src/shared/store/authStore";

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  updated_at?: string;
  edited_at?: string;
  deleted_at?: string;
  read_by: string[];
  reactions?: Record<string, string[]>;
  status?: string;
  sender?: {
    id: string;
    display_name: string;
    role: string;
    avatar_url?: string;
  };
}

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  background: "#EEF8FF",
  surface: "#FFFFFF",
  surfaceBlue: "#E0F2FE",

  primary: "#38BDF8",
  primaryDark: "#0284C7",
  primarySoft: "#BAE6FD",

  text: "#0F172A",
  secondary: "#475569",
  muted: "#94A3B8",

  border: "#D8ECF7",

  incoming: "#FFFFFF",
  outgoing: "#DDF3FF",

  danger: "#EF4444",
  success: "#22C55E",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#7C3AED",
  dispatcher: "#0284C7",
  driver: "#16A34A",
  staff: "#64748B",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "ADMIN",
  dispatcher: "DISPATCHER",
  driver: "DRIVER",
  staff: "STAFF",
};

const QUICK_REACTIONS = ["👍", "❤️", "😂", "👏"];

/* =========================================================
   ADMIN CHAT SCREEN
========================================================= */

export default function AdminChatScreen() {
  const router = useRouter();

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
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  } = useOptimizedChat();

  const [text, setText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(
    null,
  );

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  const currentUserId = user?.uid;

  /* =========================================================
     MARK MESSAGES AS READ
  ========================================================= */

  useEffect(() => {
    if (!loading && currentUserId) {
      markAsRead();
    }
  }, [loading, currentUserId, markAsRead]);

  /* =========================================================
     ROLE HELPERS
  ========================================================= */

  const getRoleLabel = useCallback((role?: string) => {
    if (!role) return "STAFF";

    return ROLE_LABELS[role.toLowerCase()] || role.toUpperCase();
  }, []);

  const getRoleColor = useCallback((role?: string) => {
    if (!role) return ROLE_COLORS.staff;

    return ROLE_COLORS[role.toLowerCase()] || ROLE_COLORS.staff;
  }, []);

  /* =========================================================
     TIME FORMAT
  ========================================================= */

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

  /* =========================================================
     DATE SEPARATOR
  ========================================================= */

  const shouldShowDate = useCallback(
    (index: number) => {
      if (index === 0) return true;

      const current = new Date(messages[index].created_at);

      const previous = new Date(messages[index - 1].created_at);

      return current.toDateString() !== previous.toDateString();
    },
    [messages],
  );

  /* =========================================================
     DATE LABEL
  ========================================================= */

  const formatDateLabel = useCallback((dateString: string) => {
    const date = new Date(dateString);

    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "TODAY";
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return "YESTERDAY";
    }

    return date
      .toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase();
  }, []);

  /* =========================================================
     SEND MESSAGE
  ========================================================= */

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();

    if (!trimmed || sending) return;

    setText("");

    try {
      await sendMessage(trimmed);

      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({
          animated: true,
        });
      });
    } catch (error) {
      console.error("Send message error:", error);

      setText(trimmed);

      Alert.alert(
        "Message Error",
        "Unable to send the message. Please try again.",
      );
    }
  }, [text, sending, sendMessage]);

  /* =========================================================
     REFRESH
  ========================================================= */

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);

    try {
      await refreshMessages();
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, refreshMessages]);

  /* =========================================================
     LOAD OLDER
  ========================================================= */

  const handleLoadOlder = useCallback(async () => {
    if (!hasMore || loading) return;

    await loadOlderMessages();
  }, [hasMore, loading, loadOlderMessages]);

  /* =========================================================
     EDIT MESSAGE
  ========================================================= */

  const handleEdit = useCallback(
    (message: ChatMessage) => {
      if (Platform.OS === "ios") {
        Alert.prompt(
          "Edit Message",
          "Update your message:",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Save",
              onPress: async (value?: string) => {
                if (!value?.trim()) return;

                await editMessage(message.id, value.trim());
              },
            },
          ],
          "plain-text",
          message.message,
        );

        return;
      }

      /*
       * Android does not support Alert.prompt.
       * Use a simple temporary edit prompt through
       * the same chat input.
       */
      Alert.alert(
        "Edit Message",
        "Android does not support the native text prompt here.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Copy to input",
            onPress: () => {
              setText(message.message);
              inputRef.current?.focus();
            },
          },
        ],
      );
    },
    [editMessage],
  );

  /* =========================================================
     DELETE MESSAGE
  ========================================================= */

  const handleDelete = useCallback(
    (message: ChatMessage) => {
      Alert.alert(
        "Delete Message",
        "Are you sure you want to delete this message?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await deleteMessage(message.id);
            },
          },
        ],
      );
    },
    [deleteMessage],
  );

  /* =========================================================
     MESSAGE LONG PRESS
  ========================================================= */

  const handleMessageLongPress = useCallback(
    (message: ChatMessage) => {
      const isMine = message.sender_id === currentUserId;

      if (message.deleted_at) return;

      const options = isMine
        ? ["React", "Edit Message", "Delete Message", "Cancel"]
        : ["React", "Cancel"];

      Alert.alert(
        message.sender?.display_name || "Message",
        "Choose an action",
        options.map((option) => ({
          text: option,
          style:
            option === "Delete Message"
              ? "destructive"
              : option === "Cancel"
                ? "cancel"
                : "default",

          onPress: () => {
            if (option === "React") {
              setSelectedMessage(message);
            }

            if (option === "Edit Message") {
              handleEdit(message);
            }

            if (option === "Delete Message") {
              handleDelete(message);
            }
          },
        })),
      );
    },
    [currentUserId, handleEdit, handleDelete],
  );

  /* =========================================================
     REACTION
  ========================================================= */

  const handleReaction = useCallback(
    async (message: ChatMessage, emoji: string) => {
      if (!currentUserId) return;

      const users = message.reactions?.[emoji] || [];

      if (users.includes(currentUserId)) {
        await removeReaction(message.id, emoji);
      } else {
        await addReaction(message.id, emoji);
      }

      setSelectedMessage(null);
    },
    [currentUserId, addReaction, removeReaction],
  );

  /* =========================================================
     REACTION CHIPS
  ========================================================= */

  const renderReactions = useCallback(
    (message: ChatMessage) => {
      const reactions = message.reactions;

      if (!reactions) return null;

      const entries = Object.entries(reactions).filter(
        ([, users]) => users.length > 0,
      );

      if (!entries.length) return null;

      return (
        <View style={styles.reactionsRow}>
          {entries.map(([emoji, users]) => {
            const reacted = currentUserId && users.includes(currentUserId);

            return (
              <Pressable
                key={emoji}
                onPress={() => handleReaction(message, emoji)}
                style={[
                  styles.reactionChip,
                  reacted && styles.reactionChipActive,
                ]}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>

                <Text
                  style={[
                    styles.reactionCount,
                    reacted && styles.reactionCountActive,
                  ]}
                >
                  {users.length}
                </Text>
              </Pressable>
            );
          })}
        </View>
      );
    },
    [currentUserId, handleReaction],
  );

  /* =========================================================
     MESSAGE RENDERER
  ========================================================= */

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isMine = item.sender_id === currentUserId;

      const senderName = item.sender?.display_name || "Unknown Staff";

      const role = item.sender?.role || "staff";

      const roleColor = getRoleColor(role);

      const deleted = !!item.deleted_at;

      return (
        <View>
          {/* DATE SEPARATOR */}

          {shouldShowDate(index) && (
            <View style={styles.dateSeparator}>
              <View style={styles.dateLine} />

              <View style={styles.datePill}>
                <Text style={styles.dateText}>
                  {formatDateLabel(item.created_at)}
                </Text>
              </View>

              <View style={styles.dateLine} />
            </View>
          )}

          {/* MESSAGE ROW */}

          <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
            {/* INCOMING AVATAR */}

            {!isMine && (
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: roleColor,
                  },
                ]}
              >
                <Text style={styles.avatarText}>
                  {senderName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View
              style={[styles.messageColumn, isMine && styles.messageColumnMine]}
            >
              {/* SENDER */}

              {!isMine && (
                <View style={styles.senderHeader}>
                  <Text style={styles.senderName}>{senderName}</Text>

                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor: `${roleColor}18`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        {
                          color: roleColor,
                        },
                      ]}
                    >
                      {getRoleLabel(role)}
                    </Text>
                  </View>
                </View>
              )}

              {/* MESSAGE BUBBLE */}

              <Pressable
                onLongPress={() => handleMessageLongPress(item)}
                delayLongPress={350}
                style={[
                  styles.messageBubble,
                  isMine ? styles.messageBubbleMine : styles.messageBubbleOther,
                ]}
              >
                {deleted ? (
                  <Text style={styles.deletedText}>Message deleted</Text>
                ) : (
                  <Text
                    style={[
                      styles.messageText,
                      isMine && styles.messageTextMine,
                    ]}
                  >
                    {item.message}
                  </Text>
                )}

                {/* MESSAGE META */}

                <View
                  style={[styles.messageMeta, isMine && styles.messageMetaMine]}
                >
                  {item.edited_at && !deleted && (
                    <Text
                      style={[
                        styles.editedText,
                        isMine && styles.editedTextMine,
                      ]}
                    >
                      edited
                    </Text>
                  )}

                  <Text
                    style={[styles.timeText, isMine && styles.timeTextMine]}
                  >
                    {formatTime(item.created_at)}
                  </Text>

                  {isMine && (
                    <Text
                      style={[
                        styles.checkIcon,
                        {
                          color:
                            item.read_by?.length > 1
                              ? COLORS.primaryDark
                              : COLORS.muted,
                        },
                      ]}
                    >
                      {item.read_by?.length > 1 ? "✓✓" : "✓"}
                    </Text>
                  )}
                </View>
              </Pressable>

              {/* REACTIONS */}

              {renderReactions(item)}
            </View>
          </View>
        </View>
      );
    },
    [
      currentUserId,
      getRoleColor,
      getRoleLabel,
      shouldShowDate,
      formatDateLabel,
      formatTime,
      handleMessageLongPress,
      renderReactions,
    ],
  );

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading && messages.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingClay}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />

          <Text style={styles.loadingText}>Loading staff chat...</Text>
        </View>
      </View>
    );
  }

  /* =========================================================
     MAIN SCREEN
  ========================================================= */

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          {/* BACK */}

          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Text style={styles.headerIcon}>‹</Text>
          </Pressable>

          {/* TITLE */}

          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <View style={styles.chatIcon}>
                <Text style={styles.chatIconText}>💬</Text>
              </View>

              <View>
                <Text style={styles.headerTitle}>Staff Chat</Text>

                <View style={styles.onlineRow}>
                  <View style={styles.onlineDot} />

                  <Text style={styles.onlineText}>Staff General Chat</Text>
                </View>
              </View>
            </View>
          </View>

          {/* REFRESH */}

          <Pressable onPress={handleRefresh} style={styles.headerButton}>
            <Text style={styles.refreshIcon}>↻</Text>
          </Pressable>
        </View>

        {/* =================================================
            UNREAD BANNER
        ================================================= */}

        {unreadCount > 0 && (
          <Pressable onPress={markAsRead} style={styles.unreadBanner}>
            <Text style={styles.unreadIcon}>✉</Text>

            <Text style={styles.unreadBannerText}>
              {unreadCount} unread {unreadCount === 1 ? "message" : "messages"}
            </Text>

            <Text style={styles.unreadBannerAction}>Mark read</Text>
          </Pressable>
        )}

        {/* =================================================
            MESSAGE LIST
        ================================================= */}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messageList}
          contentContainerStyle={[
            styles.messageContent,
            messages.length === 0 && styles.emptyMessageContent,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onStartReached={handleLoadOlder}
          onStartReachedThreshold={0.2}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primaryDark}
            />
          }
          ListHeaderComponent={
            hasMore ? (
              <Pressable
                onPress={handleLoadOlder}
                style={styles.loadOlderButton}
              >
                <Text style={styles.loadOlderIcon}>↑</Text>

                <Text style={styles.loadOlderText}>Load older messages</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconClay}>
                <Text style={styles.emptyIconText}>💬</Text>
              </View>

              <Text style={styles.emptyTitle}>No messages yet</Text>

              <Text style={styles.emptySubtitle}>
                Start a conversation with the staff.
              </Text>
            </View>
          }
        />

        {/* =================================================
            REACTION PICKER
        ================================================= */}

        {selectedMessage && (
          <View style={styles.reactionPicker}>
            {QUICK_REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => handleReaction(selectedMessage, emoji)}
                style={styles.reactionPickerButton}
              >
                <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => setSelectedMessage(null)}
              style={styles.reactionPickerClose}
            >
              <Text style={styles.closeIcon}>×</Text>
            </Pressable>
          </View>
        )}

        {/* =================================================
            INPUT
        ================================================= */}

        <View style={styles.inputArea}>
          <View style={styles.inputClay}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder="Message staff..."
              placeholderTextColor={COLORS.muted}
              multiline
              maxLength={2000}
              style={styles.input}
              editable={!sending}
              returnKeyType="default"
            />

            <View style={styles.inputActions}>
              <Text style={styles.characterCount}>{text.length}/2000</Text>

              <Pressable
                onPress={handleSend}
                disabled={!text.trim() || sending}
                style={[
                  styles.sendButton,
                  (!text.trim() || sending) && styles.sendButtonDisabled,
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendIcon}>➤</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardContainer: {
    flex: 1,
  },

  /* =====================================================
     LOADING
  ===================================================== */

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  loadingClay: {
    width: "85%",
    paddingVertical: 32,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    alignItems: "center",

    shadowColor: "#7DD3FC",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
  },

  /* =====================================================
     HEADER
  ===================================================== */

  header: {
    minHeight: 78,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: 10,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: COLORS.surface,

    shadowColor: "#7DD3FC",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 15,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.surfaceBlue,

    shadowColor: "#7DD3FC",
    shadowOffset: {
      width: 2,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },

  headerIcon: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: "300",
    color: COLORS.text,
  },

  refreshIcon: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },

  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },

  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.primarySoft,

    marginRight: 10,
  },

  chatIconText: {
    fontSize: 19,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,

    backgroundColor: COLORS.success,

    marginRight: 5,
  },

  onlineText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
  },

  /* =====================================================
     UNREAD
  ===================================================== */

  unreadBanner: {
    marginHorizontal: 14,
    marginTop: 10,

    paddingHorizontal: 14,
    paddingVertical: 10,

    borderRadius: 15,

    backgroundColor: COLORS.primarySoft,

    flexDirection: "row",
    alignItems: "center",
  },

  unreadIcon: {
    fontSize: 17,
    color: COLORS.primaryDark,
  },

  unreadBannerText: {
    flex: 1,
    marginLeft: 8,

    fontSize: 12,
    fontWeight: "700",

    color: COLORS.primaryDark,
  },

  unreadBannerAction: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primaryDark,
  },

  /* =====================================================
     MESSAGE LIST
  ===================================================== */

  messageList: {
    flex: 1,
  },

  messageContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 18,
  },

  emptyMessageContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  /* =====================================================
     LOAD OLDER
  ===================================================== */

  loadOlderButton: {
    alignSelf: "center",

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: COLORS.surface,

    paddingHorizontal: 15,
    paddingVertical: 9,

    borderRadius: 15,
    marginBottom: 15,

    shadowColor: "#7DD3FC",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 7,
    elevation: 3,
  },

  loadOlderIcon: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primaryDark,
  },

  loadOlderText: {
    marginLeft: 5,

    fontSize: 11,
    fontWeight: "700",

    color: COLORS.primaryDark,
  },

  /* =====================================================
     DATE
  ===================================================== */

  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },

  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  datePill: {
    marginHorizontal: 10,

    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 10,

    backgroundColor: COLORS.surfaceBlue,
  },

  dateText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },

  /* =====================================================
     MESSAGE
  ===================================================== */

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 11,
  },

  messageRowMine: {
    justifyContent: "flex-end",
  },

  avatar: {
    width: 35,
    height: 35,
    borderRadius: 13,

    justifyContent: "center",
    alignItems: "center",

    marginRight: 8,

    shadowColor: "#64748B",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  messageColumn: {
    maxWidth: "78%",
  },

  messageColumnMine: {
    alignItems: "flex-end",
  },

  senderHeader: {
    flexDirection: "row",
    alignItems: "center",

    marginBottom: 4,
    marginLeft: 3,
  },

  senderName: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  roleBadge: {
    marginLeft: 6,

    paddingHorizontal: 6,
    paddingVertical: 2,

    borderRadius: 6,
  },

  roleBadgeText: {
    fontSize: 7,
    fontWeight: "900",
  },

  messageBubble: {
    paddingHorizontal: 13,
    paddingTop: 10,
    paddingBottom: 8,

    borderRadius: 18,

    shadowColor: "#7DD3FC",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 3,
  },

  messageBubbleOther: {
    backgroundColor: COLORS.incoming,

    borderBottomLeftRadius: 5,
  },

  messageBubbleMine: {
    backgroundColor: COLORS.outgoing,

    borderBottomRightRadius: 5,
  },

  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },

  messageTextMine: {
    color: "#075985",
  },

  deletedText: {
    fontSize: 13,
    fontStyle: "italic",
    color: COLORS.muted,
  },

  /* =====================================================
     MESSAGE META
  ===================================================== */

  messageMeta: {
    marginTop: 5,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  messageMetaMine: {
    justifyContent: "flex-end",
  },

  timeText: {
    fontSize: 9,
    color: COLORS.muted,
    marginLeft: 4,
  },

  timeTextMine: {
    color: "#38A3D8",
  },

  editedText: {
    fontSize: 8,
    color: COLORS.muted,
    fontStyle: "italic",
  },

  editedTextMine: {
    color: "#38A3D8",
  },

  checkIcon: {
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
  },

  /* =====================================================
     REACTIONS
  ===================================================== */

  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },

  reactionChip: {
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 7,
    paddingVertical: 3,

    borderRadius: 10,

    marginRight: 4,
    marginBottom: 3,

    backgroundColor: COLORS.surface,

    shadowColor: "#64748B",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  reactionChipActive: {
    backgroundColor: COLORS.primarySoft,
  },

  reactionEmoji: {
    fontSize: 12,
  },

  reactionCount: {
    marginLeft: 3,

    fontSize: 9,
    fontWeight: "700",

    color: COLORS.secondary,
  },

  reactionCountActive: {
    color: COLORS.primaryDark,
  },

  /* =====================================================
     REACTION PICKER
  ===================================================== */

  reactionPicker: {
    position: "absolute",

    bottom: 88,
    left: 20,
    right: 20,

    backgroundColor: COLORS.surface,

    borderRadius: 20,
    padding: 8,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#0EA5E9",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 8,
  },

  reactionPickerButton: {
    width: 43,
    height: 43,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 14,

    backgroundColor: COLORS.surfaceBlue,

    marginHorizontal: 3,
  },

  reactionPickerEmoji: {
    fontSize: 21,
  },

  reactionPickerClose: {
    width: 35,
    height: 35,

    borderRadius: 12,

    alignItems: "center",
    justifyContent: "center",

    marginLeft: 5,

    backgroundColor: "#F1F5F9",
  },

  closeIcon: {
    fontSize: 25,
    lineHeight: 27,
    fontWeight: "300",
    color: COLORS.secondary,
  },

  /* =====================================================
     INPUT
  ===================================================== */

  inputArea: {
    paddingHorizontal: 12,
    paddingTop: 8,

    paddingBottom: Platform.OS === "ios" ? 18 : 10,

    backgroundColor: COLORS.background,
  },

  inputClay: {
    minHeight: 58,
    maxHeight: 130,

    borderRadius: 21,

    paddingLeft: 15,
    paddingRight: 7,
    paddingVertical: 7,

    flexDirection: "row",
    alignItems: "flex-end",

    backgroundColor: COLORS.surface,

    shadowColor: "#7DD3FC",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.17,
    shadowRadius: 12,
    elevation: 5,
  },

  input: {
    flex: 1,
    maxHeight: 105,

    paddingTop: 8,
    paddingBottom: 8,

    fontSize: 14,
    lineHeight: 19,

    color: COLORS.text,
  },

  inputActions: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },

  characterCount: {
    fontSize: 8,
    color: COLORS.muted,

    marginBottom: 3,
    marginRight: 3,
  },

  sendButton: {
    width: 43,
    height: 43,

    borderRadius: 15,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.primaryDark,

    shadowColor: "#0284C7",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 7,
    elevation: 4,
  },

  sendButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },

  sendIcon: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  /* =====================================================
     EMPTY
  ===================================================== */

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
  },

  emptyIconClay: {
    width: 90,
    height: 90,

    borderRadius: 30,

    backgroundColor: COLORS.primarySoft,

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 18,

    shadowColor: "#38BDF8",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },

  emptyIconText: {
    fontSize: 42,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.text,
  },

  emptySubtitle: {
    marginTop: 6,

    textAlign: "center",

    fontSize: 13,
    lineHeight: 19,

    color: COLORS.secondary,
  },
});
