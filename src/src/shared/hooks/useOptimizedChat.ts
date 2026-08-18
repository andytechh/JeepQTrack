import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import { supabase } from "../config/supabase";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

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

const ROOM_ID = "staff-general-chat";
const PAGE_SIZE = 20;
const CACHE_SIZE = 500;

const CHAT_CHANNEL = "staff-chat-staff-general-chat";
const NOTIFICATION_CHANNEL = "chat";
const NOTIFICATION_SOUND = "chat.wav";

const setupNotificationChannel = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL, {
      name: "Chat Messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      sound: NOTIFICATION_SOUND,
      showBadge: true,
    });
  } catch (error) {
    console.error("❌ Notification channel error:", error);
  }
};

/*
 * ============================================================
 * PUSH TOKEN REGISTRATION
 * ============================================================
 *
 * IMPORTANT DISTINCTION:
 *
 * `Notifications.getExpoPushTokenAsync()` returns an EXPO push
 * token (format: "ExponentPushToken[xxxxxxxx]"). This is what
 * you send to Expo's push relay (https://exp.host/--/api/v2/push/send),
 * which then forwards to FCM (Android) / APNs (iOS) on your behalf.
 * This is what `sendPushIfNeeded()` further down uses.
 *
 * `Notifications.getDevicePushTokenAsync()` returns the RAW
 * native token — an actual FCM registration token on Android,
 * or an APNs token on iOS. This is what you need if you intend
 * to call the Firebase Admin SDK / FCM HTTP v1 API directly,
 * bypassing Expo's relay entirely.
 *
 * The original bug: only the Expo token was ever fetched, so
 * nothing resembling a raw FCM token could ever land in
 * Supabase — the code path simply didn't request one.
 *
 * Below we fetch BOTH and store them in separate columns so you
 * can use whichever push pipeline you actually want. If you only
 * plan to send via Expo's relay, you can safely ignore/drop the
 * `fcm_token` column and the device-token portion below.
 *
 * You'll need these columns on `users` (adjust names as you like):
 *   expo_push_token   text
 *   fcm_token         text
 *   push_token_type   text   -- 'fcm' | 'apns' | null
 * ============================================================
 */

interface PushTokens {
  expoPushToken: string | null;
  deviceToken: string | null;
  deviceTokenType: "fcm" | "apns" | null;
}

const registerPushToken = async (
  userId: string,
): Promise<PushTokens | null> => {
  if (!userId) {
    return null;
  }

  if (Platform.OS === "web") {
    return null;
  }

  const result: PushTokens = {
    expoPushToken: null,
    deviceToken: null,
    deviceTokenType: null,
  };

  try {
    await setupNotificationChannel();

    const existingPermissions = await Notifications.getPermissionsAsync();

    let finalStatus = existingPermissions.status;

    if (finalStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();

      finalStatus = requested.status;
    }

    if (finalStatus !== "granted") {
      console.warn("⚠️ Notification permission was not granted.");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.error(
        "❌ Expo projectId is missing. Check app.json extra.eas.projectId.",
      );
      // We can still try to get a raw device token below even
      // without a projectId, since that call doesn't need one.
    }

    // --- 1. Expo push token (for Expo's push relay) ---
    if (projectId) {
      try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId,
        });

        result.expoPushToken = tokenResponse.data || null;

        console.log("📱 Expo Push Token:", result.expoPushToken);
      } catch (error) {
        console.error("❌ Failed to get Expo push token:", error);
      }
    }

    // --- 2. Raw device token (actual FCM / APNs token) ---
    try {
      const deviceTokenResponse = await Notifications.getDevicePushTokenAsync();

      result.deviceToken = deviceTokenResponse?.data ?? null;
      result.deviceTokenType =
        deviceTokenResponse?.type === "android"
          ? "fcm"
          : deviceTokenResponse?.type === "ios"
            ? "apns"
            : null;

      console.log(
        `📱 Device Push Token (${result.deviceTokenType ?? "unknown"}):`,
        result.deviceToken,
      );
    } catch (error) {
      console.error("❌ Failed to get device push token:", error);
    }

    if (!result.expoPushToken && !result.deviceToken) {
      console.error("❌ No push token could be obtained.");
      return null;
    }

    // --- 3. Persist to Supabase, only if something changed ---
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("id, expo_push_token, fcm_token")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error("❌ Failed to check existing push token:", userError);
      return result;
    }

    const needsUpdate =
      existingUser?.expo_push_token !== result.expoPushToken ||
      existingUser?.fcm_token !== result.deviceToken;

    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          expo_push_token: result.expoPushToken,
          fcm_token: result.deviceToken,
          push_token_type: result.deviceTokenType,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("❌ Failed to save push tokens:", updateError);
      } else {
        console.log("✅ Push tokens saved to Supabase.");
      }
    } else {
      console.log("✅ Push tokens already up to date.");
    }

    return result;
  } catch (error) {
    console.error("❌ Push token registration error:", error);

    return null;
  }
};

class ChatConnection {
  private static instance: ChatConnection;

  private channel: any = null;

  private listeners = new Set<(message: ChatMessage) => void>();

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private currentUserId: string | null = null;

  private appState = AppState.currentState;

  private isSubscribed = false;

  private isConnecting = false;

  private shouldReconnect = true;

  private reconnectAttempts = 0;

  private readonly maxReconnectAttempts = 5;

  /*
   * ============================================================
   * RACE-CONDITION FIX
   * ============================================================
   * Problem: `connect()` could be entered again (React StrictMode
   * double-invoking effects, a quick AppState foreground event
   * right after mount, Fast Refresh, etc.) before the previous
   * call had finished tearing down / setting up its channel. That
   * produced:
   *   "cannot add `postgres_changes` callbacks ... after subscribe()"
   * because a second `connect()` could start creating/wiring a
   * channel while the first one hadn't finished yet.
   *
   * On top of that, `channel.subscribe()`'s status callback is
   * itself async/late — an OLD, already-torn-down channel can
   * still fire a final "CLOSED" event *after* a newer channel has
   * already taken over. That stale callback was mutating the
   * shared `isSubscribed` / `isConnecting` flags and scheduling a
   * bogus reconnect, even though the new connection was fine —
   * exactly the "connected... then reconnecting anyway" loop you
   * saw in the logs.
   *
   * Fix:
   *  1. `connectChain` serializes every `connect()` call through a
   *     promise chain so the create-channel -> add-listeners ->
   *     subscribe sequence can NEVER overlap between two calls.
   *  2. `generation` tags each real connection attempt. Any
   *     callback (subscribe status, reconnect timer) captures the
   *     generation it belongs to and is a no-op if a newer
   *     generation has since taken over.
   * ============================================================
   */
  private connectChain: Promise<void> = Promise.resolve();

  private generation = 0;

  static getInstance() {
    if (!ChatConnection.instance) {
      ChatConnection.instance = new ChatConnection();
    }

    return ChatConnection.instance;
  }

  async connect(userId: string) {
    if (!userId) {
      return;
    }

    this.currentUserId = userId;
    this.shouldReconnect = true;

    // Serialize: whatever happens, chain onto the previous attempt
    // so two connect() calls never run their setup logic at once.
    this.connectChain = this.connectChain
      .catch(() => {
        // Swallow errors from a previous link so the chain keeps working.
      })
      .then(() => this.connectOnce(userId));

    return this.connectChain;
  }

  private async connectOnce(userId: string) {
    // If a newer call already changed which user we're connecting
    // as, or we're already connected/connecting, skip this attempt.
    if (userId !== this.currentUserId) {
      return;
    }

    if (this.isSubscribed || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    const myGeneration = ++this.generation;

    try {
      await setupNotificationChannel();

      await this.destroyChannel();

      // Something newer superseded us while we were awaiting above.
      if (myGeneration !== this.generation) {
        return;
      }

      const channel = supabase.channel(CHAT_CHANNEL);

      this.channel = channel;

      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${ROOM_ID}`,
        },
        async (payload: any) => {
          if (myGeneration !== this.generation) {
            return;
          }

          const message = payload?.new as ChatMessage;

          if (!message?.id) {
            return;
          }

          await this.fetchSenderAndNotify(message);
        },
      );

      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${ROOM_ID}`,
        },
        (payload: any) => {
          if (myGeneration !== this.generation) {
            return;
          }

          const message = payload?.new as ChatMessage;

          if (!message?.id) {
            return;
          }

          this.notifyListeners(message);
        },
      );

      channel.subscribe((status: string) => {
        // Ignore events from a channel generation that's no longer current.
        if (myGeneration !== this.generation) {
          return;
        }

        if (status === "SUBSCRIBED") {
          this.isSubscribed = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          console.log("✅ Staff chat realtime connected");

          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          this.isSubscribed = false;
          this.isConnecting = false;

          console.warn(`⚠️ Staff chat realtime: ${status}`);

          if (this.shouldReconnect) {
            this.scheduleReconnect(myGeneration);
          }
        }
      });
    } catch (error) {
      if (myGeneration === this.generation) {
        this.isSubscribed = false;
        this.isConnecting = false;
      }

      console.error("❌ Staff chat connection error:", error);

      if (this.shouldReconnect && myGeneration === this.generation) {
        this.scheduleReconnect(myGeneration);
      }
    }
  }

  private async fetchSenderAndNotify(message: ChatMessage) {
    try {
      if (!message.sender) {
        const { data: sender, error } = await supabase
          .from("users")
          .select("id, display_name, role, avatar_url")
          .eq("id", message.sender_id)
          .maybeSingle();

        if (!error && sender) {
          message.sender = sender;
        }
      }
    } catch (error) {
      console.error("❌ Failed to fetch sender:", error);
    }

    this.notifyListeners(message);

    await this.sendPushIfNeeded(message);
  }

  private scheduleReconnect(forGeneration: number) {
    if (!this.shouldReconnect) {
      return;
    }

    if (!this.currentUserId) {
      return;
    }

    if (this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("⚠️ Maximum chat reconnect attempts reached.");
      return;
    }

    this.reconnectAttempts += 1;

    const delay = Math.min(2000 * this.reconnectAttempts, 10000);

    console.log(`🔄 Reconnecting staff chat in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;

      if (!this.shouldReconnect || !this.currentUserId) {
        return;
      }

      // A newer connection attempt already superseded the one that
      // scheduled this reconnect (e.g. it already reconnected
      // successfully) — nothing to do.
      if (forGeneration !== this.generation) {
        return;
      }

      await this.connect(this.currentUserId);
    }, delay);
  }

  setAppState(state: string) {
    this.appState = state;
  }

  async disconnect() {
    this.shouldReconnect = false;

    // Bump the generation so any in-flight subscribe callback or
    // reconnect timer tied to the old generation becomes a no-op.
    this.generation += 1;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isSubscribed = false;
    this.isConnecting = false;

    await this.destroyChannel();

    this.currentUserId = null;
  }

  private async destroyChannel() {
    const channel = this.channel;

    if (!channel) {
      return;
    }

    this.channel = null;

    try {
      await supabase.removeChannel(channel);
    } catch (error) {
      console.warn("⚠️ Failed to remove chat channel:", error);
    }
  }

  addListener(callback: (message: ChatMessage) => void) {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(message: ChatMessage) {
    this.listeners.forEach((callback) => {
      try {
        callback(message);
      } catch (error) {
        console.error("❌ Chat listener error:", error);
      }
    });
  }

  private async sendPushIfNeeded(message: ChatMessage) {
    if (!this.currentUserId || message.sender_id === this.currentUserId) {
      return;
    }

    if (this.appState === "active") {
      return;
    }

    try {
      const senderName = message.sender?.display_name || "Someone";

      const { data: receiver, error } = await supabase
        .from("users")
        .select("expo_push_token")
        .eq("id", this.currentUserId)
        .maybeSingle();

      if (error) {
        console.error("❌ Push token lookup error:", error);
        return;
      }

      if (!receiver?.expo_push_token) {
        console.warn("⚠️ Receiver has no Expo push token.");
        return;
      }

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: receiver.expo_push_token,
          title: `💬 ${senderName}`,
          body: message.message?.substring(0, 100) || "New message",
          sound: NOTIFICATION_SOUND,
          priority: "high",
          channelId: NOTIFICATION_CHANNEL,
          badge: 1,
          data: {
            type: "chat",
            room_id: ROOM_ID,
            sender_id: message.sender_id,
            message_id: message.id,
          },
        }),
      });

      const result = await response.json();

      console.log("📨 Expo push response:", result);
    } catch (error) {
      console.error("❌ Push notification error:", error);
    }
  }
}

export const chatConnection = ChatConnection.getInstance();

class MessageCache {
  private messages: ChatMessage[] = [];

  private readonly maxSize: number;

  constructor(maxSize = CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  getAll() {
    return [...this.messages];
  }

  add(message: ChatMessage) {
    if (this.messages.some((item) => item.id === message.id)) {
      return;
    }

    this.messages.push(message);

    this.messages.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    if (this.messages.length > this.maxSize) {
      this.messages = this.messages.slice(-this.maxSize);
    }
  }

  addOrUpdate(message: ChatMessage) {
    const index = this.messages.findIndex((item) => item.id === message.id);

    if (index === -1) {
      this.add(message);
      return;
    }

    this.messages[index] = {
      ...this.messages[index],
      ...message,
    };

    this.messages.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  addBatch(messages: ChatMessage[]) {
    messages.forEach((message) => this.addOrUpdate(message));
  }

  prepend(messages: ChatMessage[]) {
    messages.forEach((message) => this.addOrUpdate(message));
  }

  update(messageId: string, changes: Partial<ChatMessage>) {
    this.messages = this.messages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            ...changes,
          }
        : message,
    );
  }

  clear() {
    this.messages = [];
  }
}

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

  const mountedRef = useRef(true);

  const oldestMessageRef = useRef<string | null>(null);

  const shouldSkipRecalculation = useRef(false);

  /*
   * ============================================================
   * FIX: fetch the LATEST page of messages, not the oldest.
   * ============================================================
   * The original query used `.order("created_at", { ascending: true })`
   * with `.limit(PAGE_SIZE)` and no offset — that always returns the
   * FIRST 20 messages ever posted in the room, not the most recent 20.
   * As a result the chat screen loaded old history on mount and never
   * caught up to "now" until enough realtime messages arrived to fill
   * the gap.
   *
   * The fix: order DESCENDING (newest first) to grab the latest page,
   * then reverse it locally so the rest of the code (which expects
   * oldest -> newest ordering for the cache / FlatList) keeps working
   * unchanged.
   * ============================================================
   */
  const fetchInitialMessages = useCallback(async () => {
    if (!user?.uid) {
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*, sender:users!sender_id(id, display_name, role, avatar_url)")
        .eq("room_id", ROOM_ID)
        .order("created_at", {
          ascending: false, // newest first
        })
        .limit(PAGE_SIZE);

      if (error) {
        throw error;
      }

      // Reverse back to oldest -> newest for cache/UI consistency.
      const loadedMessages = (data || []).slice().reverse();

      cache.clear();

      cache.addBatch(loadedMessages);

      if (loadedMessages.length > 0) {
        oldestMessageRef.current = loadedMessages[0].id;
      }

      if (!shouldSkipRecalculation.current) {
        const unread = loadedMessages.filter(
          (message) =>
            message.sender_id !== user.uid &&
            !message.read_by?.includes(user.uid),
        ).length;

        setUnreadCount(unread);
      }

      // hasMore now reflects whether this latest page was full,
      // i.e. whether there's older history beyond it to page into.
      setHasMore(loadedMessages.length === PAGE_SIZE);

      if (mountedRef.current) {
        setMessages(cache.getAll());
      }
    } catch (error) {
      console.error("❌ Fetch chat error:", error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.uid, cache, setUnreadCount]);

  const loadOlderMessages = useCallback(async () => {
    if (!oldestMessageRef.current || !hasMore) {
      return;
    }

    try {
      const { data: oldest, error: oldestError } = await supabase
        .from("chat_messages")
        .select("created_at")
        .eq("id", oldestMessageRef.current)
        .maybeSingle();

      if (oldestError) {
        throw oldestError;
      }

      if (!oldest) {
        return;
      }

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*, sender:users!sender_id(id, display_name, role, avatar_url)")
        .eq("room_id", ROOM_ID)
        .lt("created_at", oldest.created_at)
        .order("created_at", {
          ascending: false, // fetch nearest-older page first...
        })
        .limit(PAGE_SIZE);

      if (error) {
        throw error;
      }

      // ...then reverse to oldest -> newest before prepending.
      const older = (data || []).slice().reverse();

      if (older.length > 0) {
        cache.prepend(older);

        oldestMessageRef.current = older[0].id;

        if (mountedRef.current) {
          setMessages(cache.getAll());
        }
      }

      setHasMore(older.length === PAGE_SIZE);
    } catch (error) {
      console.error("❌ Pagination error:", error);
    }
  }, [cache, hasMore]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !user?.uid) {
        return;
      }

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

        if (error) {
          throw error;
        }

        if (data && mountedRef.current) {
          cache.addOrUpdate(data);

          setMessages(cache.getAll());
        }
      } catch (error) {
        console.error("❌ Send error:", error);

        throw error;
      } finally {
        if (mountedRef.current) {
          setSending(false);
        }
      }
    },
    [user?.uid, cache],
  );

  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      if (!user?.uid || !newText.trim()) {
        return;
      }

      const editedAt = new Date().toISOString();

      const { error } = await supabase
        .from("chat_messages")
        .update({
          message: newText.trim(),
          edited_at: editedAt,
        })
        .eq("id", messageId)
        .eq("sender_id", user.uid);

      if (error) {
        throw error;
      }

      cache.update(messageId, {
        message: newText.trim(),
        edited_at: editedAt,
      });

      if (mountedRef.current) {
        setMessages(cache.getAll());
      }
    },
    [user?.uid, cache],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!user?.uid) {
        return;
      }

      const deletedAt = new Date().toISOString();

      const { error } = await supabase
        .from("chat_messages")
        .update({
          deleted_at: deletedAt,
          message: "",
        })
        .eq("id", messageId)
        .eq("sender_id", user.uid);

      if (error) {
        throw error;
      }

      cache.update(messageId, {
        deleted_at: deletedAt,
        message: "",
      });

      if (mountedRef.current) {
        setMessages(cache.getAll());
      }
    },
    [user?.uid, cache],
  );

  const adminDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!user?.uid) {
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.uid)
        .maybeSingle();

      if (adminError) {
        throw adminError;
      }

      if (admin?.role?.toLowerCase() !== "admin") {
        throw new Error("Only administrators can delete messages.");
      }

      const deletedAt = new Date().toISOString();

      const { error } = await supabase
        .from("chat_messages")
        .update({
          deleted_at: deletedAt,
          message: "",
        })
        .eq("id", messageId);

      if (error) {
        throw error;
      }

      cache.update(messageId, {
        deleted_at: deletedAt,
        message: "",
      });

      if (mountedRef.current) {
        setMessages(cache.getAll());
      }
    },
    [user?.uid, cache],
  );

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user?.uid) {
        return;
      }

      const current = cache
        .getAll()
        .find((message) => message.id === messageId);

      if (!current) {
        return;
      }

      const reactions = current.reactions || {};

      const users = reactions[emoji] || [];

      if (users.includes(user.uid)) {
        return;
      }

      const updated = {
        ...reactions,
        [emoji]: [...users, user.uid],
      };

      const { error } = await supabase
        .from("chat_messages")
        .update({
          reactions: updated,
        })
        .eq("id", messageId);

      if (error) {
        throw error;
      }

      cache.update(messageId, {
        reactions: updated,
      });

      if (mountedRef.current) {
        setMessages(cache.getAll());
      }
    },
    [user?.uid, cache],
  );

  const removeReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user?.uid) {
        return;
      }

      const current = cache
        .getAll()
        .find((message) => message.id === messageId);

      if (!current) {
        return;
      }

      const reactions = current.reactions || {};

      const users = reactions[emoji] || [];

      if (!users.includes(user.uid)) {
        return;
      }

      const remaining = users.filter((id) => id !== user.uid);

      const updated = {
        ...reactions,
      };

      if (remaining.length === 0) {
        delete updated[emoji];
      } else {
        updated[emoji] = remaining;
      }

      const { error } = await supabase
        .from("chat_messages")
        .update({
          reactions: updated,
        })
        .eq("id", messageId);

      if (error) {
        throw error;
      }

      cache.update(messageId, {
        reactions: updated,
      });

      if (mountedRef.current) {
        setMessages(cache.getAll());
      }
    },
    [user?.uid, cache],
  );

  const markAsRead = useCallback(async () => {
    if (!user?.uid) {
      return;
    }

    shouldSkipRecalculation.current = true;

    resetUnreadCount();

    try {
      const { error: rpcError } = await supabase.rpc("mark_messages_read", {
        p_room_id: ROOM_ID,
        p_user_id: user.uid,
      });

      if (rpcError) {
        console.warn("⚠️ mark_messages_read RPC failed:", rpcError);
      }

      const updated = cache.getAll().map((message) => {
        if (message.sender_id === user.uid) {
          return message;
        }

        if (message.read_by?.includes(user.uid)) {
          return message;
        }

        return {
          ...message,
          read_by: [...(message.read_by || []), user.uid],
        };
      });

      cache.clear();

      cache.addBatch(updated);

      if (mountedRef.current) {
        setMessages(cache.getAll());
      }

      setUnreadCount(0);
    } catch (error) {
      console.error("❌ Mark read error:", error);
    } finally {
      setTimeout(() => {
        shouldSkipRecalculation.current = false;
      }, 1000);
    }
  }, [user?.uid, cache, resetUnreadCount, setUnreadCount]);

  const refreshMessages = useCallback(async () => {
    shouldSkipRecalculation.current = false;

    await fetchInitialMessages();
  }, [fetchInitialMessages]);

  useEffect(() => {
    mountedRef.current = true;

    if (!user?.uid) {
      setLoading(false);
      return;
    }

    registerPushToken(user.uid);

    connection.setAppState(AppState.currentState);

    connection.connect(user.uid);

    const unsubscribe = connection.addListener((incomingMessage) => {
      if (!mountedRef.current) {
        return;
      }

      cache.addOrUpdate(incomingMessage);

      setMessages(cache.getAll());

      if (
        incomingMessage.sender_id !== user.uid &&
        !incomingMessage.read_by?.includes(user.uid)
      ) {
        if (AppState.currentState !== "active") {
          incrementUnreadCount();
        }
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

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextState) => {
        connection.setAppState(nextState);

        if (nextState === "active" && user?.uid) {
          await registerPushToken(user.uid);

          await connection.connect(user.uid);

          if (!shouldSkipRecalculation.current) {
            await fetchInitialMessages();
          }
        }
      },
    );

    return () => subscription.remove();
  }, [user?.uid, connection, fetchInitialMessages]);

  useEffect(() => {
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          const data = response.notification.request.content.data as any;

          if (data?.type === "chat") {
            resetUnreadCount();

            await markAsRead();
          }
        },
      );

    return () => responseSubscription.remove();
  }, [markAsRead, resetUnreadCount]);

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

    editMessage,
    deleteMessage,
    adminDeleteMessage,

    addReaction,
    removeReaction,
  };
}
