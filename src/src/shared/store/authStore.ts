// src/shared/store/authStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { User } from "../types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Commuter browsing without an account. */
  isGuest: boolean;
  setUser: (user: User | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  continueAsGuest: () => void;
  exitGuest: () => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isGuest: false,

      setUser: (user) => {
        // Signing in supersedes guest mode; signing out leaves it untouched
        // so a guest who fails a session refresh stays a guest.
        set((state) => ({
          user,
          isAuthenticated: !!user,
          isLoading: false,
          isGuest: user ? false : state.isGuest,
        }));
      },

      setIsAuthenticated: (value) => set({ isAuthenticated: value }),

      setIsLoading: (value) => set({ isLoading: value }),

      continueAsGuest: () =>
        set({
          user: null,
          isAuthenticated: false,
          isGuest: true,
          isLoading: false,
        }),

      exitGuest: () => set({ isGuest: false }),

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isGuest: false,
          isLoading: false,
        });
      },

      hydrate: () => {
        set((state) => ({
          isLoading: false,
          isAuthenticated: !!state.user,
        }));
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, isGuest: state.isGuest }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrate();
        }
      },
    },
  ),
);
