// useGlobalChatListener.ts
import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { chatConnection } from "./useOptimizedChat";

let globalListenerAdded = false;

export function useGlobalChatListener() {
  const { user } = useAuthStore();
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    userIdRef.current = user.uid;

    // Ensure connection is alive for this user
    chatConnection.connect(user.uid);

    if (!globalListenerAdded) {
      globalListenerAdded = true;

      chatConnection.addListener((newMessage) => {
        // Use getState() to always get the latest increment function
        const { incrementUnreadCount } = useChatStore.getState();
        if (
          newMessage.sender_id !== userIdRef.current &&
          !newMessage.read_by?.includes(userIdRef.current!)
        ) {
          incrementUnreadCount();
        }
      });
    }
  }, [user?.uid]); // remove incrementUnreadCount from deps
}
