// useGlobalChatListener.ts
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { supabase } from "../config/supabase"; // adjust import
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { chatConnection } from "./useOptimizedChat";

const ROOM_ID = "staff-general-chat"; // same as in useOptimizedChat
let globalListenerAdded = false;

// Helper to fetch and set unread count from DB
async function fetchUnreadCount(userId: string) {
  try {
    const { count, error } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("room_id", ROOM_ID)
      .neq("sender_id", userId)
      .not("read_by", "cs", `{${userId}}`);

    if (!error && count !== null) {
      useChatStore.getState().setUnreadCount(count);
      console.log(`📊 Global unread count set to ${count}`);
    }
  } catch (err) {
    console.error("❌ Failed to fetch unread count:", err);
  }
}

export function useGlobalChatListener() {
  const { user } = useAuthStore();
  const userIdRef = useRef<string | null>(null);

  // ─── CONNECTION & RECONNECT ON FOREGROUND ──────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    userIdRef.current = user.uid;

    const handleAppState = (nextState: string) => {
      if (nextState === "active") {
        // Reconnect realtime channel
        chatConnection.disconnect();
        chatConnection.connect(user.uid!);

        // 🔥 Fetch latest unread count when app comes to foreground
        fetchUnreadCount(user.uid!);
      }
    };

    // Initial connect & fetch
    chatConnection.connect(user.uid);
    fetchUnreadCount(user.uid);

    const subscription = AppState.addEventListener("change", handleAppState);
    return () => subscription.remove();
  }, [user?.uid]);

  // ─── SINGLETON UNREAD INCREMENT LISTENER ────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    userIdRef.current = user.uid;

    if (!globalListenerAdded) {
      globalListenerAdded = true;

      chatConnection.addListener((newMessage) => {
        // Still increment in realtime (fast update)
        const { incrementUnreadCount } = useChatStore.getState();
        if (
          newMessage.sender_id !== userIdRef.current &&
          !newMessage.read_by?.includes(userIdRef.current!)
        ) {
          incrementUnreadCount();
        }
      });
    }
  }, [user?.uid]);
}
-0;
