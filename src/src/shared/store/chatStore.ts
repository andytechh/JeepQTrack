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
      setUnreadCount: (count: number) => set({ unreadCount: count }),
      incrementUnreadCount: () =>
        set((state) => ({
          unreadCount: Math.min(state.unreadCount + 1, 99),
        })),
      resetUnreadCount: () => set({ unreadCount: 0 }),
      clearStore: async () => {
        // Clear from memory
        set({ unreadCount: 0 });
        // Clear from AsyncStorage
        await AsyncStorage.removeItem("chat-storage");
      },
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
