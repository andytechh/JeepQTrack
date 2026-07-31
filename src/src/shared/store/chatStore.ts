// src/shared/store/chatStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ChatState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      unreadCount: 0,
      setUnreadCount: (count: number) => set({ unreadCount: count }),
      incrementUnreadCount: () =>
        set((state) => ({
          unreadCount: Math.min(state.unreadCount + 1, 99),
        })),
      resetUnreadCount: () => set({ unreadCount: 0 }),
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
