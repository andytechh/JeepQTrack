// src/shared/store/authStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { supabase } from "../config/supabase";
import { User } from "../types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  logout: () => void;
  hydrate: () => void;
  refreshUser: () => Promise<void>; // 👈 new method
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        });
      },

      setIsAuthenticated: (value) => set({ isAuthenticated: value }),

      setIsLoading: (value) => set({ isLoading: value }),

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      hydrate: () => {
        set((state) => ({
          isLoading: false,
          isAuthenticated: !!state.user,
        }));
      },

      refreshUser: async () => {
        const currentUser = get().user;
        if (!currentUser?.uid) return;

        try {
          const { data, error } = await supabase
            .from("users")
            .select(
              "id, email, display_name, phone_number, role, jeepney_id, is_active, preferred_terminal",
            )
            .eq("id", currentUser.uid)
            .single();

          if (error) throw error;

          if (data) {
            const updatedUser: User = {
              uid: data.id,
              email: data.email,
              displayName: data.display_name,
              phoneNumber: data.phone_number,
              role: data.role,
              jeepneyId: data.jeepney_id,
              isActive: data.is_active,
              terminalId: data.preferred_terminal ?? 1,
            };
            set({ user: updatedUser });
          }
        } catch (err) {
          console.error("Failed to refresh user:", err);
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrate();
        }
      },
    },
  ),
);
