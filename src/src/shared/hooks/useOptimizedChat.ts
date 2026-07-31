import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "../config/supabase";
import { useAuthStore } from "../store/authStore";

// ─── TYPES ──────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  read_by: string[];
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
const CACHE_SIZE = 50; // Only keep last 50 messages in memory
const DEBOUNCE_MS = 1000; // 1 second debounce

// ─── SINGLETON CONNECTION ───────────────────────────────────────────
// 1. Single WebSocket for entire app
class ChatConnection {
  private static instance: ChatConnection;
  private channel: any = null;
  private listeners = new Set<(msg: ChatMessage) => void>();
  private debounceTimer: NodeJS.Timeout | null = null;

  static getInstance() {
    if (!ChatConnection.instance) {
      ChatConnection.instance = new ChatConnection();
    }
    return ChatConnection.instance;
  }

  connect(userId: string) {
    if (this.channel) return; // Already connected

    // 4. Debounce realtime updates
    this.channel = supabase
      .channel(`chat_${ROOM_ID}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${ROOM_ID}`,
        },
        (payload) => {
          // Debounce: batch updates within 1 second
          if (this.debounceTimer) clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => {
            this.notifyListeners(payload.new);
          }, DEBOUNCE_MS);
        },
      )
      .subscribe();
  }

  // 5. Disconnect when app in background
  disconnect() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  addListener(callback: (msg: ChatMessage) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(message: ChatMessage) {
    this.listeners.forEach((cb) => cb(message));
  }
}

// ─── MEMORY CACHE ───────────────────────────────────────────────────
// 2. Cache only last 50 messages
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
    // Avoid duplicates
    if (this.messages.some((m) => m.id === message.id)) return;

    this.messages.push(message);
    // Trim to max size
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

  get size() {
    return this.messages.length;
  }
}

// ─── MAIN HOOK ──────────────────────────────────────────────────────
export function useOptimizedChat() {
  const { user } = useAuthStore();
  const connection = useMemo(() => ChatConnection.getInstance(), []);
  const cache = useMemo(() => new MessageCache(CACHE_SIZE), []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const oldestMessageRef = useRef<string | null>(null);

  // ─── FETCH INITIAL MESSAGES ───────────────────────────────────────
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
      setMessages(cache.getAll());

      if (msgs.length > 0) {
        oldestMessageRef.current = msgs[0].id;
      }
      setHasMore(msgs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [cache]);

  // ─── PAGINATE OLDER MESSAGES ──────────────────────────────────────
  // 3. Paginate older messages from server
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
      if (olderMessages.length > 0) {
        oldestMessageRef.current = olderMessages[0].id;
        cache.prepend(olderMessages);
        setMessages(cache.getAll());
      }
      setHasMore(olderMessages.length === PAGE_SIZE);
    } catch (error) {
      console.error("Pagination error:", error);
    }
  }, [cache, hasMore]);

  // ─── SEND MESSAGE ─────────────────────────────────────────────────
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

        // Optimistically add to cache
        if (data) {
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

  // ─── MARK AS READ ─────────────────────────────────────────────────
  const markAsRead = useCallback(async () => {
    if (!user?.uid) return;
    setUnreadCount(0);

    try {
      await supabase.rpc("mark_messages_read", {
        p_room_id: ROOM_ID,
        p_user_id: user.uid,
      });
    } catch (error) {
      console.error("Mark read error:", error);
    }
  }, [user?.uid]);

  // ─── CONNECTION LIFECYCLE ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    // Connect
    connection.connect(user.uid);

    // Listen for new messages
    const unsubscribe = connection.addListener((newMessage) => {
      if (newMessage.sender_id !== user.uid) {
        setUnreadCount((prev) => Math.min(prev + 1, 99));
      }
      cache.add(newMessage);
      setMessages(cache.getAll());
    });

    // Fetch initial messages
    fetchInitialMessages();

    return () => {
      unsubscribe();
    };
  }, [user?.uid, connection, cache, fetchInitialMessages]);

  // ─── APP STATE HANDLER ────────────────────────────────────────────
  // 5. Disconnect when app in background
  useEffect(() => {
    const handleAppState = (nextState: string) => {
      if (nextState === "active") {
        if (user?.uid) {
          connection.connect(user.uid);
          fetchInitialMessages(); // Refresh when coming back
        }
      } else if (nextState === "background") {
        connection.disconnect();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    return () => subscription.remove();
  }, [user?.uid, connection, fetchInitialMessages]);

  return {
    messages,
    loading,
    sending,
    hasMore,
    unreadCount,
    sendMessage,
    loadOlderMessages,
    markAsRead,
    refreshMessages: fetchInitialMessages,
  };
}
