import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ChatState {
  unreadCount: number;

  setUnreadCount: (count: number) => void;

  incrementUnreadCount: () => void;

  resetUnreadCount: () => void;

  clearStore: () => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      unreadCount: 0,

      setUnreadCount: (count: number) =>
        set({
          unreadCount: Math.max(0, Math.min(count, 99)),
        }),

      incrementUnreadCount: () =>
        set((state) => ({
          unreadCount: Math.min(state.unreadCount + 1, 99),
        })),

      resetUnreadCount: () =>
        set({
          unreadCount: 0,
        }),

      clearStore: async () => {
        set({
          unreadCount: 0,
        });

        try {
          await AsyncStorage.removeItem("chat-storage");
        } catch (error) {
          console.error("Failed to clear chat storage:", error);
        }
      },
    }),
    {
      name: "chat-storage",

      storage: createJSONStorage(() => AsyncStorage),

      partialize: (state) => ({
        unreadCount: state.unreadCount,
      }),
    },
  ),
);
