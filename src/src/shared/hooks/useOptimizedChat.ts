// src/shared/hooks/useOptimizedChat.ts
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { supabase } from "../config/supabase";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

// ─── TYPES ──────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  updated_at?: string;
  read_by: string[];
  status?: string;
  sender?: {
    id: string;
    display_name: string;
    role: string;
    avatar_url?: string;
  };
}

// ─── CONSTANTS ──────────────────────────────────────────────────────
const ROOM_ID = "staff-general-chat";
const PAGE_SIZE = 20;
const CACHE_SIZE = 50;
const DEBOUNCE_MS = 1000;

// ─── NOTIFICATION CHANNEL ───────────────────────────────────────────
const setupNotificationChannel = async () => {
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("chat", {
        name: "Chat Messages",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        showBadge: true,
      });
      console.log("✅ Chat notification channel created");
    } catch (error) {
      console.error("❌ Failed to create chat notification channel:", error);
    }
  }
};

// ─── SINGLETON CONNECTION ───────────────────────────────────────────
class ChatConnection {
  private static instance: ChatConnection;
  private channel: any = null;
  private listeners = new Set<(msg: ChatMessage) => void>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private currentUserId: string | null = null;
  private appState = "active";
  private isSubscribed = false;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  static getInstance() {
    if (!ChatConnection.instance) {
      ChatConnection.instance = new ChatConnection();
    }
    return ChatConnection.instance;
  }

  connect(userId: string) {
    this.currentUserId = userId;

    if (this.isSubscribed) {
      console.log("📡 Already subscribed to chat channel");
      return;
    }

    if (this.isConnecting) {
      console.log("📡 Already connecting to chat channel");
      return;
    }

    if (this.channel) {
      try {
        this.channel.unsubscribe();
      } catch (e) {
        console.log("Error unsubscribing:", e);
      }
      this.channel = null;
      this.isSubscribed = false;
    }

    this.isConnecting = true;
    setupNotificationChannel();

    console.log("📡 Creating new chat subscription...");

    const channelName = `chat_${ROOM_ID}_${Date.now()}`;
    this.channel = supabase.channel(channelName);

    this.channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${ROOM_ID}`,
      },
      (payload) => {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          const newMsg = payload.new as ChatMessage;
          // 🔥 FIX: Fetch sender info if missing
          this.fetchSenderAndNotify(newMsg);
        }, DEBOUNCE_MS);
      },
    );

    this.channel.subscribe((status: string) => {
      console.log(`📡 Chat subscription status: ${status}`);
      if (status === "SUBSCRIBED") {
        this.isSubscribed = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      } else if (status === "CHANNEL_ERROR") {
        this.isConnecting = false;
        this.isSubscribed = false;
        this.handleReconnect();
      }
    });
  }

  // ─── Fetch sender for realtime messages ──────────────────────────
  private async fetchSenderAndNotify(newMsg: ChatMessage) {
    try {
      if (!newMsg.sender) {
        const { data: sender } = await supabase
          .from("users")
          .select("id, display_name, role, avatar_url")
          .eq("id", newMsg.sender_id)
          .single();

        if (sender) {
          newMsg.sender = sender;
        }
      }
    } catch (error) {
      console.error("❌ Failed to fetch sender:", error);
    } finally {
      this.notifyListeners(newMsg);
      this.sendPushIfNeeded(newMsg);
    }
  }

  private handleReconnect() {
    if (
      this.reconnectAttempts < this.maxReconnectAttempts &&
      this.currentUserId
    ) {
      this.reconnectAttempts++;
      console.log(
        `🔄 Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
      );
      setTimeout(() => {
        this.connect(this.currentUserId!);
      }, 2000 * this.reconnectAttempts);
    } else {
      console.log("❌ Max reconnect attempts reached");
    }
  }

  setAppState(state: string) {
    this.appState = state;
  }

  disconnect() {
    if (this.channel) {
      try {
        this.channel.unsubscribe();
      } catch (e) {
        console.log("Error unsubscribing:", e);
      }
      this.channel = null;
      this.isSubscribed = false;
      this.isConnecting = false;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  addListener(callback: (msg: ChatMessage) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(message: ChatMessage) {
    this.listeners.forEach((cb) => {
      try {
        cb(message);
      } catch (error) {
        console.error("Error in listener:", error);
      }
    });
  }

  private async sendPushIfNeeded(message: ChatMessage) {
    if (
      this.appState !== "active" &&
      message.sender_id !== this.currentUserId &&
      this.currentUserId
    ) {
      try {
        const senderName = message.sender?.display_name || "Someone";

        const { data: receiver } = await supabase
          .from("users")
          .select("expo_push_token")
          .eq("id", this.currentUserId)
          .single();

        if (receiver?.expo_push_token) {
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: receiver.expo_push_token,
              title: `💬 ${senderName}`,
              body: message.message.substring(0, 100),
              priority: "high",
              channelId: "chat",
              badge: 1,
              data: {
                type: "chat",
                room_id: ROOM_ID,
                sender_id: message.sender_id,
                message_id: message.id,
              },
            }),
          });
          console.log("📲 Push notification sent for chat message");
        }
      } catch (error) {
        console.error("Push notification error:", error);
      }
    }
  }
}

// ─── MEMORY CACHE ───────────────────────────────────────────────────
class MessageCache {
  private messages: ChatMessage[] = [];
  private readonly maxSize: number;

  constructor(maxSize = CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  getAll(): ChatMessage[] {
    return this.messages;
  }

  add(message: ChatMessage) {
    if (this.messages.some((m) => m.id === message.id)) return;
    this.messages.push(message);
    if (this.messages.length > this.maxSize) {
      this.messages = this.messages.slice(-this.maxSize);
    }
  }

  addBatch(messages: ChatMessage[]) {
    messages.forEach((m) => this.add(m));
  }

  prepend(messages: ChatMessage[]) {
    const existingIds = new Set(this.messages.map((m) => m.id));
    const newMessages = messages.filter((m) => !existingIds.has(m.id));
    this.messages = [...newMessages, ...this.messages];
    if (this.messages.length > this.maxSize) {
      this.messages = this.messages.slice(-this.maxSize);
    }
  }

  clear() {
    this.messages = [];
  }
}

// ─── MAIN HOOK ──────────────────────────────────────────────────────
export function useOptimizedChat() {
  const { user } = useAuthStore();
  const {
    unreadCount,
    setUnreadCount,
    incrementUnreadCount,
    resetUnreadCount,
  } = useChatStore();
  const connection = useMemo(() => ChatConnection.getInstance(), []);
  const cache = useMemo(() => new MessageCache(CACHE_SIZE), []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const shouldSkipRecalculation = useRef(false);
  const oldestMessageRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const isInitialLoadRef = useRef(true);

  // ─── FETCH INITIAL MESSAGES ──────────────────────────────────────
  const fetchInitialMessages = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*, sender:users!sender_id(id, display_name, role, avatar_url)")
        .eq("room_id", ROOM_ID)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const msgs = (data || []).reverse();
      cache.clear();
      cache.addBatch(msgs);

      if (mountedRef.current) {
        setMessages(cache.getAll());

        if (user?.uid && !shouldSkipRecalculation.current) {
          const unread = msgs.filter(
            (msg) =>
              msg.sender_id !== user.uid && !msg.read_by?.includes(user.uid),
          ).length;
          setUnreadCount(unread);
          console.log(`📊 Unread count calculated: ${unread}`);
        }

        if (msgs.length > 0) {
          oldestMessageRef.current = msgs[0].id;
        }
        setHasMore(msgs.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [cache, user?.uid, setUnreadCount]);

  // ─── LOAD OLDER MESSAGES ──────────────────────────────────────────
  const loadOlderMessages = useCallback(async () => {
    if (!oldestMessageRef.current || !hasMore) return;
    try {
      const { data: olderMsg } = await supabase
        .from("chat_messages")
        .select("created_at")
        .eq("id", oldestMessageRef.current)
        .single();

      if (!olderMsg) return;

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*, sender:users!sender_id(id, display_name, role, avatar_url)")
        .eq("room_id", ROOM_ID)
        .lt("created_at", olderMsg.created_at)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const olderMessages = (data || []).reverse();
      if (olderMessages.length > 0 && mountedRef.current) {
        oldestMessageRef.current = olderMessages[0].id;
        cache.prepend(olderMessages);
        setMessages(cache.getAll());
      }
      setHasMore(olderMessages.length === PAGE_SIZE);
    } catch (error) {
      console.error("Pagination error:", error);
    }
  }, [cache, hasMore]);

  // ─── SEND MESSAGE ──────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !user?.uid) return;
      setSending(true);
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .insert({
            room_id: ROOM_ID,
            sender_id: user.uid,
            message: text.trim(),
            read_by: [user.uid],
          })
          .select(
            "*, sender:users!sender_id(id, display_name, role, avatar_url)",
          )
          .single();

        if (error) throw error;

        if (data && mountedRef.current) {
          cache.add(data);
          setMessages(cache.getAll());
        }
      } catch (error) {
        console.error("Send error:", error);
      } finally {
        setSending(false);
      }
    },
    [user?.uid, cache],
  );

  // ─── MARK AS READ ──────────────────────────────────────────────────
  const markAsRead = useCallback(async () => {
    if (!user?.uid) return;

    shouldSkipRecalculation.current = true;
    resetUnreadCount();
    console.log("📊 Unread count reset to 0");

    try {
      const { error: rpcError } = await supabase.rpc("mark_messages_read", {
        p_room_id: ROOM_ID,
        p_user_id: user.uid,
      });

      if (rpcError) {
        console.error("❌ RPC Error:", rpcError);
        const { error: updateError } = await supabase
          .from("chat_messages")
          .update({
            read_by: supabase.sql`array_append(read_by, ${user.uid})`,
          })
          .eq("room_id", ROOM_ID)
          .neq("sender_id", user.uid)
          .not("read_by", "cs", `{${user.uid}}`);

        if (updateError) {
          console.error("❌ Fallback update error:", updateError);
        } else {
          console.log("✅ Messages marked as read (fallback)");
          setMessages((prev) =>
            prev.map((msg) =>
              msg.sender_id !== user.uid && !msg.read_by?.includes(user.uid!)
                ? { ...msg, read_by: [...msg.read_by, user.uid!] }
                : msg,
            ),
          );
        }
      } else {
        console.log("✅ Messages marked as read (RPC)");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender_id !== user.uid && !msg.read_by?.includes(user.uid!)
              ? { ...msg, read_by: [...msg.read_by, user.uid!] }
              : msg,
          ),
        );
      }

      setUnreadCount(0);
    } catch (error) {
      console.error("❌ Mark read error:", error);
    }
  }, [user?.uid, resetUnreadCount, setUnreadCount]);

  // ─── REFRESH MESSAGES ─────────────────────────────────────────────
  const refreshMessages = useCallback(async () => {
    shouldSkipRecalculation.current = false;
    await fetchInitialMessages();
  }, [fetchInitialMessages]);

  // ─── CONNECTION LIFECYCLE ─────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    isInitialLoadRef.current = true;

    if (!user?.uid) {
      setLoading(false);
      return;
    }

    connection.connect(user.uid);

    const unsubscribe = connection.addListener((newMessage) => {
      if (mountedRef.current) {
        // 🔥 Now `sender` is guaranteed to be filled
        if (newMessage.sender_id !== user.uid) {
          const isRead = newMessage.read_by?.includes(user.uid);
          if (!isRead && !shouldSkipRecalculation.current) {
            incrementUnreadCount();
          }
        }
        cache.add(newMessage);
        setMessages(cache.getAll());
      }
    });

    fetchInitialMessages();

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [
    user?.uid,
    connection,
    cache,
    fetchInitialMessages,
    incrementUnreadCount,
  ]);

  // ─── APP STATE - HANDLE BACKGROUND/FOREGROUND ─────────────────────
  useEffect(() => {
    const handleAppState = (nextState: string) => {
      connection.setAppState(nextState);

      if (nextState === "active") {
        if (user?.uid) {
          connection.connect(user.uid);
          if (!isInitialLoadRef.current && !shouldSkipRecalculation.current) {
            fetchInitialMessages();
          }
          isInitialLoadRef.current = false;
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    return () => subscription.remove();
  }, [user?.uid, connection, fetchInitialMessages]);

  // ─── HANDLE NOTIFICATION TAPS ─────────────────────────────────────
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === "chat") {
          console.log("👆 Chat notification tapped");
          markAsRead();
        }
      },
    );

    return () => subscription.remove();
  }, [markAsRead]);

  return {
    messages,
    loading,
    sending,
    hasMore,
    unreadCount,
    sendMessage,
    loadOlderMessages,
    markAsRead,
    refreshMessages,
  };
}
