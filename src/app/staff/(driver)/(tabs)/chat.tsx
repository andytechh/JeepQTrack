// app/staff/(driver)/chat.tsx - Fixed with proper keyboard handling
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Edit2,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Modal,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { supabase } from "../../../../src/shared/config/supabase";
import { theme } from "../../../../src/shared/constants/theme";
import {
  ChatMessage,
  ChatService,
} from "../../../../src/shared/services/ChatService";
import { NotificationService } from "../../../../src/shared/services/NotificationService";
import { useAuthStore } from "../../../../src/shared/store/authStore";

const ROOM_ID = "staff-general-chat";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Default avatar colors for users without avatar
const AVATAR_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
];

const getAvatarColor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function ChatScreen() {
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [pendingMessageIds, setPendingMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [optionsMessage, setOptionsMessage] = useState<ChatMessage | null>(
    null,
  );
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const deleteAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);

  // --- Keyboard Listeners ──────────────────────────────────────────
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // --- Animate modal in/out ---
  const animateModalIn = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateModalOut = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };

  const animateDeleteIn = () => {
    Animated.parallel([
      Animated.spring(deleteAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateDeleteOut = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(deleteAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };

  // --- Scroll to bottom ---
  const scrollToBottom = useCallback(
    (animated: boolean = true) => {
      setTimeout(() => {
        if (flatListRef.current && messages.length > 0) {
          flatListRef.current.scrollToEnd({ animated });
        }
      }, 100);
    },
    [messages.length],
  );

  // --- Data Fetching ---
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ChatService.getMessages();

      const messageIds = new Set(data.map((m) => m.id));
      setPendingMessageIds((prev) => {
        const newSet = new Set(prev);
        for (const id of prev) {
          if (messageIds.has(id)) newSet.delete(id);
        }
        return newSet;
      });

      setMessages(data);

      if (isFirstLoad && data.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
          setIsFirstLoad(false);
        }, 300);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load messages",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isFirstLoad]);

  const fetchMembers = useCallback(async () => {
    try {
      const { data: membersData, error: membersError } = await supabase
        .from("chat_room_members")
        .select("user_id, joined_at")
        .eq("room_id", ROOM_ID);

      if (membersError) throw membersError;
      if (!membersData || membersData.length === 0) {
        setMembers([]);
        setMemberCount(0);
        return;
      }

      const userIds = membersData.map((m) => m.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, display_name, role, email, avatar_url")
        .in("id", userIds);

      if (usersError) throw usersError;

      const combinedData = membersData.map((member) => {
        const user = usersData?.find((u) => u.id === member.user_id);
        return {
          id: member.user_id,
          user_id: member.user_id,
          joined_at: member.joined_at,
          user: user || {
            id: member.user_id,
            display_name: "Unknown",
            role: "staff",
            email: "",
            avatar_url: null,
          },
        };
      });

      setMembers(combinedData);
      setMemberCount(combinedData.length);
    } catch (error) {
      console.error("Error fetching members:", error);
      setMembers([]);
      setMemberCount(0);
    }
  }, []);

  // --- Chat Operations ---
  const initializeChat = useCallback(async () => {
    if (!user?.uid) return;
    try {
      await ChatService.initializeMainRoom();
      await ChatService.joinRoom(user.uid);
    } catch (error) {
      console.error("Error initializing chat:", error);
    }
  }, [user?.uid]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.uid) return;
    try {
      await ChatService.markAllAsRead(user.uid);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [user?.uid]);

  const markChatNotificationsAsRead = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const notifications = await NotificationService.getNotifications(
        user.uid,
      );
      const chatNotifications = notifications.filter(
        (n) => n.type === "chat" && !n.read,
      );
      for (const notification of chatNotifications) {
        await NotificationService.markAsRead(notification.id);
      }
    } catch (error) {
      console.error("Error marking chat notifications as read:", error);
    }
  }, [user?.uid]);

  // --- Real-time Subscription ---
  const subscribeToRoom = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = ChatService.subscribeToRoom((newMessage) => {
      const exists = messages.some((msg) => msg.id === newMessage.id);
      const isPending = pendingMessageIds.has(newMessage.id);

      if (exists || isPending) return;

      if (newMessage.sender_id !== user?.uid) {
        setMessages((prev) => [...prev, newMessage]);
        ChatService.markAsRead(newMessage.id, user?.uid!);
        scrollToBottom(true);
      }
    });

    channelRef.current = channel;
  }, [messages, pendingMessageIds, user?.uid, scrollToBottom]);

  // --- Send Message ---
  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !user?.uid || sending) return;

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const messageText = newMessage.trim();

    const tempMessage: ChatMessage = {
      id: tempId,
      message: messageText,
      sender_id: user.uid,
      room_id: ROOM_ID,
      created_at: new Date().toISOString(),
      read_by: [user.uid],
      status: "sending",
      sender: {
        id: user.uid,
        display_name: user.display_name || "You",
        role: user.role || "staff",
        email: user.email || "",
        avatar_url: user.avatar_url || undefined,
      },
    };

    setPendingMessageIds((prev) => new Set(prev).add(tempId));
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");
    scrollToBottom(true);

    try {
      const sentMessage = await ChatService.sendMessage(user.uid, messageText);

      setPendingMessageIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });

      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== tempId);
        const exists = filtered.some((msg) => msg.id === sentMessage.id);
        if (!exists) {
          return [
            ...filtered,
            {
              ...sentMessage,
              status: "sent",
              sender: sentMessage.sender || {
                id: user.uid,
                display_name: user.display_name || "You",
                role: user.role || "staff",
                email: user.email || "",
                avatar_url: user.avatar_url || undefined,
              },
            },
          ];
        }
        return filtered;
      });

      scrollToBottom(true);
    } catch (error) {
      console.error("Error sending message:", error);

      setMessages((prev) => prev.filter((msg) => !msg.id.startsWith("temp-")));
      setPendingMessageIds((prev) => {
        const newSet = new Set(prev);
        for (const id of prev) {
          if (id.startsWith("temp-")) newSet.delete(id);
        }
        return newSet;
      });

      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to send message",
      });
    } finally {
      setSending(false);
    }
  }, [newMessage, user, sending, scrollToBottom]);

  // --- Edit Message ---
  const handleEditMessage = useCallback(async () => {
    if (!selectedMessage || !editText.trim() || !user?.uid) return;

    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({
          message: editText.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedMessage.id)
        .eq("sender_id", user.uid);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === selectedMessage.id
            ? {
                ...msg,
                message: editText.trim(),
                updated_at: new Date().toISOString(),
              }
            : msg,
        ),
      );

      Toast.show({
        type: "success",
        text1: "Message edited",
        text2: "The message has been updated",
      });
    } catch (error) {
      console.error("Error editing message:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to edit message",
      });
    } finally {
      setIsEditing(false);
      setSelectedMessage(null);
      setEditText("");
    }
  }, [selectedMessage, editText, user?.uid]);

  // --- Delete Message ---
  const handleDeleteMessage = useCallback(async () => {
    if (!deleteMessageId || !user?.uid) return;

    try {
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", deleteMessageId)
        .eq("sender_id", user.uid);

      if (error) throw error;

      setMessages((prev) => prev.filter((msg) => msg.id !== deleteMessageId));

      Toast.show({
        type: "success",
        text1: "Message deleted",
        text2: "The message has been removed",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to delete message",
      });
    } finally {
      setShowDeleteConfirm(false);
      setDeleteMessageId(null);
      animateDeleteOut();
    }
  }, [deleteMessageId, user?.uid]);

  // --- Message Long Press ---
  const handleMessageLongPress = useCallback(
    (message: ChatMessage) => {
      const isOwnMessage = message.sender_id === user?.uid;

      if (!isOwnMessage) {
        Toast.show({
          type: "info",
          text1: message.sender?.display_name || "Unknown User",
          text2:
            message.message.substring(0, 50) +
            (message.message.length > 50 ? "..." : ""),
          position: "bottom",
        });
        return;
      }

      setOptionsMessage(message);
      setShowMessageOptions(true);
      animateModalIn();
    },
    [user?.uid],
  );

  // --- Render Message Status ---
  const renderMessageStatus = useCallback(
    (message: ChatMessage) => {
      const isOwnMessage = message.sender_id === user?.uid;
      if (!isOwnMessage) return null;

      const isRead = message.read_by?.includes(user?.uid || "");
      const isSending = message.id.startsWith("temp-");

      if (isSending) {
        return (
          <View className="ml-2">
            <ActivityIndicator size={10} color={theme.colors.dark.text.muted} />
          </View>
        );
      }

      return (
        <View className="ml-2">
          {isRead ? (
            <CheckCheck size={14} color={theme.colors.primary[400]} />
          ) : (
            <Check size={14} color={theme.colors.dark.text.muted} />
          )}
        </View>
      );
    },
    [user?.uid],
  );

  // --- Render Functions ---
  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isOwnMessage = item.sender_id === user?.uid;
      const isPending = item.id.startsWith("temp-");
      const sender = item.sender as any;
      const avatarColor = getAvatarColor(item.sender_id);
      const displayName = sender?.display_name || "Unknown User";
      const initial = displayName.charAt(0)?.toUpperCase() || "U";

      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onLongPress={() => handleMessageLongPress(item)}
          delayLongPress={300}
        >
          <View
            className={`mb-3 max-w-[88%] ${isOwnMessage ? "self-end" : "self-start"}`}
          >
            {!isOwnMessage && (
              <View className="flex-row items-center mb-1">
                {sender?.avatar_url ? (
                  <Image
                    source={{ uri: sender.avatar_url }}
                    className="w-5 h-5 rounded-full mr-2"
                  />
                ) : (
                  <View
                    className="w-5 h-5 rounded-full items-center justify-center mr-2"
                    style={{ backgroundColor: avatarColor }}
                  >
                    <Text className="text-white text-[9px] font-bold">
                      {initial}
                    </Text>
                  </View>
                )}
                <Text
                  className="text-xs font-medium"
                  style={{ color: theme.colors.primary[400] }}
                >
                  {displayName}
                </Text>
                <Text
                  className="text-xs ml-1"
                  style={{ color: theme.colors.dark.text.muted }}
                >
                  • {sender?.role || "staff"}
                </Text>
              </View>
            )}

            <View
              className={`p-3 rounded-2xl ${
                isOwnMessage ? "rounded-tr-none" : "rounded-tl-none"
              }`}
              style={{
                backgroundColor: isOwnMessage
                  ? theme.colors.primary[500]
                  : "rgba(255,255,255,0.08)",
                borderWidth: isOwnMessage ? 0 : 0.5,
                borderColor: isOwnMessage
                  ? "transparent"
                  : "rgba(255,255,255,0.05)",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              <Text
                className={`text-sm ${isOwnMessage ? "text-white" : "text-white"}`}
              >
                {item.message}
              </Text>
              {isPending && (
                <Text className="text-xs text-white/50 mt-1">Sending...</Text>
              )}
              {item.updated_at &&
                item.updated_at !== item.created_at &&
                !isPending && (
                  <Text className="text-[10px] text-white/40 mt-1 italic">
                    (edited)
                  </Text>
                )}
            </View>

            <View
              className={`flex-row items-center mt-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}
            >
              <Text
                className="text-[10px]"
                style={{ color: theme.colors.dark.text.muted }}
              >
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {renderMessageStatus(item)}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [user?.uid, handleMessageLongPress, renderMessageStatus],
  );

  const renderMemberItem = useCallback(
    ({ item }: { item: any }) => {
      const displayName =
        item.user?.display_name || item.user?.email?.split("@")[0] || "Unknown";
      const initial = displayName.charAt(0)?.toUpperCase() || "U";
      const avatarColor = getAvatarColor(item.user_id);

      return (
        <View
          className="flex-row items-center p-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          {item.user?.avatar_url ? (
            <Image
              source={{ uri: item.user.avatar_url }}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: avatarColor }}
            >
              <Text className="text-white font-bold text-sm">{initial}</Text>
            </View>
          )}
          <View className="ml-3 flex-1">
            <Text className="font-semibold text-white">{displayName}</Text>
            <Text
              className="text-xs capitalize"
              style={{ color: theme.colors.dark.text.muted }}
            >
              {item.user?.role || "staff"}
            </Text>
          </View>
          {item.user_id === user?.uid && (
            <View
              className="px-2 py-1 rounded"
              style={{ backgroundColor: "rgba(14,165,233,0.2)" }}
            >
              <Text
                className="text-xs"
                style={{ color: theme.colors.primary[400] }}
              >
                You
              </Text>
            </View>
          )}
        </View>
      );
    },
    [user?.uid],
  );

  // --- Effects ---
  useEffect(() => {
    if (user?.uid) {
      initializeChat();
      fetchMessages();
      fetchMembers();
      subscribeToRoom();
      markAllAsRead();
      markChatNotificationsAsRead();
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [user?.uid]);

  // --- Main Render ---
  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.colors.dark.background }}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.dark.background}
      />

      {/* Edit Modal */}
      <Modal
        visible={isEditing}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsEditing(false);
          setSelectedMessage(null);
          setEditText("");
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 bg-black/60 justify-end">
            <View
              className="rounded-t-3xl p-6"
              style={{ backgroundColor: theme.colors.dark.background }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white text-lg font-bold">
                  Edit Message
                </Text>
                <TouchableOpacity
                  className="p-2 rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  onPress={() => {
                    setIsEditing(false);
                    setSelectedMessage(null);
                    setEditText("");
                  }}
                >
                  <X size={20} color="white" />
                </TouchableOpacity>
              </View>
              <TextInput
                ref={inputRef}
                className="rounded-xl px-4 py-3 text-white"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                }}
                value={editText}
                onChangeText={setEditText}
                multiline
                autoFocus
                placeholder="Edit your message..."
                placeholderTextColor={theme.colors.dark.text.muted}
              />
              <View className="flex-row mt-4 gap-3">
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                  onPress={() => {
                    setIsEditing(false);
                    setSelectedMessage(null);
                    setEditText("");
                  }}
                >
                  <Text className="text-white text-center">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl"
                  style={{
                    backgroundColor: editText.trim()
                      ? theme.colors.primary[500]
                      : "rgba(255,255,255,0.1)",
                  }}
                  onPress={handleEditMessage}
                  disabled={!editText.trim()}
                >
                  <Text className="text-white text-center font-semibold">
                    Save Changes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Message Options Modal */}
      <Modal
        visible={showMessageOptions}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          animateModalOut(() => {
            setShowMessageOptions(false);
            setOptionsMessage(null);
          });
        }}
      >
        <TouchableOpacity
          className="flex-1 bg-black/60"
          activeOpacity={1}
          onPress={() => {
            animateModalOut(() => {
              setShowMessageOptions(false);
              setOptionsMessage(null);
            });
          }}
        >
          <Animated.View
            style={{
              flex: 1,
              opacity: fadeAnim,
            }}
          >
            <Animated.View
              style={{
                flex: 1,
                justifyContent: "flex-end",
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_HEIGHT * 0.4, 0],
                    }),
                  },
                ],
              }}
            >
              <BlurView
                intensity={30}
                tint="dark"
                className="rounded-t-3xl p-6"
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  minHeight: SCREEN_HEIGHT * 0.35,
                }}
              >
                <View className="items-center mb-4">
                  <View
                    className="w-12 h-1 rounded-full"
                    style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                  />
                </View>

                <View className="flex-row items-center mb-4">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: getAvatarColor(
                        optionsMessage?.sender_id || "",
                      ),
                    }}
                  >
                    <Text className="text-white font-bold text-sm">
                      {optionsMessage?.sender?.display_name
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                    </Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-white font-semibold">
                      {optionsMessage?.sender?.display_name || "Unknown"}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.dark.text.muted }}
                    >
                      {optionsMessage?.sender?.role || "staff"} •
                      {" " +
                        new Date(
                          optionsMessage?.created_at || "",
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    </Text>
                  </View>
                </View>

                <View
                  className="mb-4 p-3 rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                >
                  <Text className="text-white/80 text-sm" numberOfLines={3}>
                    {optionsMessage?.message}
                  </Text>
                </View>

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 py-3.5 rounded-xl flex-row items-center justify-center"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.06)",
                    }}
                    onPress={() => {
                      if (optionsMessage) {
                        animateModalOut(() => {
                          setShowMessageOptions(false);
                          setSelectedMessage(optionsMessage);
                          setEditText(optionsMessage.message);
                          setIsEditing(true);
                          setTimeout(() => inputRef.current?.focus(), 300);
                        });
                      }
                    }}
                  >
                    <Edit2 size={18} color={theme.colors.primary[400]} />
                    <Text className="text-white ml-2 font-medium">Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 py-3.5 rounded-xl flex-row items-center justify-center"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      borderWidth: 1,
                      borderColor: "rgba(239, 68, 68, 0.2)",
                    }}
                    onPress={() => {
                      animateModalOut(() => {
                        setShowMessageOptions(false);
                        if (optionsMessage) {
                          setDeleteMessageId(optionsMessage.id);
                          setShowDeleteConfirm(true);
                          animateDeleteIn();
                        }
                      });
                    }}
                  >
                    <Trash2 size={18} color="#EF4444" />
                    <Text className="text-[#EF4444] ml-2 font-medium">
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  className="mt-3 py-3 rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  onPress={() => {
                    animateModalOut(() => {
                      setShowMessageOptions(false);
                      setOptionsMessage(null);
                    });
                  }}
                >
                  <Text className="text-white/60 text-center font-medium">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </BlurView>
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          animateDeleteOut(() => {
            setShowDeleteConfirm(false);
            setDeleteMessageId(null);
          });
        }}
      >
        <TouchableOpacity
          className="flex-1 bg-black/60"
          activeOpacity={1}
          onPress={() => {
            animateDeleteOut(() => {
              setShowDeleteConfirm(false);
              setDeleteMessageId(null);
            });
          }}
        >
          <Animated.View
            style={{
              flex: 1,
              opacity: fadeAnim,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 24,
            }}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    scale: deleteAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              }}
            >
              <View
                className="rounded-3xl p-6"
                style={{
                  backgroundColor: theme.colors.dark.background,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.06)",
                  maxWidth: 400,
                  width: "100%",
                }}
              >
                <View className="items-center mb-4">
                  <View
                    className="w-16 h-16 rounded-full items-center justify-center mb-3"
                    style={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}
                  >
                    <AlertTriangle size={32} color="#EF4444" />
                  </View>
                  <Text className="text-white text-xl font-bold">
                    Delete Message?
                  </Text>
                  <Text
                    className="text-center mt-2"
                    style={{ color: theme.colors.dark.text.muted }}
                  >
                    This message will be permanently removed from the chat. This
                    action cannot be undone.
                  </Text>
                </View>

                <View className="flex-row gap-3 mt-4">
                  <TouchableOpacity
                    className="flex-1 py-3 rounded-xl"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                    onPress={() => {
                      animateDeleteOut(() => {
                        setShowDeleteConfirm(false);
                        setDeleteMessageId(null);
                      });
                    }}
                  >
                    <Text className="text-white text-center font-medium">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 py-3 rounded-xl"
                    style={{ backgroundColor: "#EF4444" }}
                    onPress={handleDeleteMessage}
                  >
                    <Text className="text-white text-center font-semibold">
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <View className="flex-1">
        {/* Header */}
        <LinearGradient
          colors={["rgba(15, 23, 42, 0.95)", "rgba(15, 23, 42, 0.8)"]}
          className="flex-row items-center px-4 pt-4 pb-3"
        >
          <View className="flex-1">
            <Text className="text-white text-lg font-bold">Staff Chat</Text>
            <Text className="text-white/50 text-xs">
              {memberCount} member{memberCount !== 1 ? "s" : ""} online
            </Text>
          </View>

          <TouchableOpacity
            className="p-2.5 rounded-full"
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => setShowMembers(true)}
            activeOpacity={0.7}
          >
            <Users size={20} color="white" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Messages - Dynamic padding based on keyboard */}
        <View style={{ flex: 1, position: "relative" }}>
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator
                size="large"
                color={theme.colors.primary[500]}
              />
              <Text
                className="mt-4"
                style={{ color: theme.colors.dark.text.muted }}
              >
                Loading messages...
              </Text>
            </View>
          ) : (
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                className="flex-1 px-4 pt-4"
                contentContainerStyle={{
                  paddingBottom: keyboardHeight > 0 ? keyboardHeight + 70 : 20,
                  flexGrow: 1,
                }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                      setRefreshing(true);
                      fetchMessages();
                    }}
                    tintColor={theme.colors.primary[500]}
                  />
                }
                onLayout={() => {
                  if (isFirstLoad && messages.length > 0) {
                    setTimeout(() => {
                      flatListRef.current?.scrollToEnd({ animated: false });
                      setIsFirstLoad(false);
                    }, 300);
                  }
                }}
                ListEmptyComponent={
                  <View className="flex-1 items-center justify-center py-20">
                    <Text
                      className="text-center"
                      style={{ color: theme.colors.dark.text.muted }}
                    >
                      No messages yet
                    </Text>
                    <Text
                      className="text-sm mt-1"
                      style={{ color: theme.colors.dark.text.dim }}
                    >
                      Be the first to send a message!
                    </Text>
                  </View>
                }
              />
            </TouchableWithoutFeedback>
          )}

          {/* Input - Fixed at bottom with keyboard handling */}
          <View
            className="flex-row items-end p-4 border-t"
            style={{
              borderColor: "rgba(255,255,255,0.05)",
              backgroundColor: theme.colors.dark.background,
              paddingBottom: keyboardHeight > 0 ? keyboardHeight : 16,
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
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.dark.text.muted}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              editable={!sending}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              className="ml-2 p-3.5 rounded-full"
              style={{
                backgroundColor:
                  newMessage.trim() && !sending
                    ? theme.colors.primary[500]
                    : "rgba(255,255,255,0.05)",
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Send
                  size={20}
                  color={newMessage.trim() ? "white" : "rgba(255,255,255,0.3)"}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Members Modal */}
        <Modal
          visible={showMembers}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowMembers(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View
              className="rounded-t-3xl max-h-[70%] min-h-[40%]"
              style={{ backgroundColor: theme.colors.dark.background }}
            >
              <View
                className="flex-row items-center justify-between p-4 border-b"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <Text className="text-lg font-bold text-white">
                  Members ({members.length})
                </Text>
                <TouchableOpacity onPress={() => setShowMembers(false)}>
                  <Text className="text-white/70 font-medium">Close</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={members}
                keyExtractor={(item) => item.id}
                renderItem={renderMemberItem}
                className="p-2"
                ListEmptyComponent={
                  <View className="items-center py-8">
                    <Text style={{ color: theme.colors.dark.text.muted }}>
                      No members found
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
