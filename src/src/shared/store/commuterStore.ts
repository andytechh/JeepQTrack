import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface CommuterProfile {
  name: string;
  mobile: string;
  notificationsEnabled: boolean;
  onboardingCompleted: boolean;
}

interface CompleteOnboardingData {
  name: string;
  mobile: string;
  notificationsEnabled: boolean;
}

interface CommuterState {
  profile: CommuterProfile | null;
  hasHydrated: boolean;

  setHasHydrated: (value: boolean) => void;
  completeOnboarding: (data: CompleteOnboardingData) => void;
  updateProfile: (data: Partial<CommuterProfile>) => void;
  clearProfile: () => void;
  resetOnboarding: () => void;
}

// No-op storage used during static export / SSR, where `window` doesn't
// exist and AsyncStorage's web shim would otherwise crash.
const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const useCommuterStore = create<CommuterState>()(
  persist(
    (set) => ({
      profile: null,

      hasHydrated: false,

      setHasHydrated: (value) => {
        set({ hasHydrated: value });
      },

      completeOnboarding: ({ name, mobile, notificationsEnabled }) => {
        set({
          profile: {
            name: name.trim(),
            mobile,
            notificationsEnabled,
            onboardingCompleted: true,
          },
        });
      },

      updateProfile: (data) => {
        set((state) => {
          if (!state.profile) {
            return state;
          }

          return {
            profile: {
              ...state.profile,
              ...data,
            },
          };
        });
      },

      clearProfile: () => {
        set({
          profile: null,
        });
      },

      resetOnboarding: () => {
        set({
          profile: null,
        });
      },
    }),

    {
      name: "jeepqtrack-commuter",

      // Only use AsyncStorage on the client; fall back to the no-op storage
      // during static export / any environment without `window`, so the
      // Supabase/Zustand hydration never touches localStorage in Node.
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : AsyncStorage,
      ),

      partialize: (state) => ({
        profile: state.profile,
      }),

      onRehydrateStorage: () => {
        return (_state, error) => {
          if (error) {
            console.error("Failed to hydrate commuter store:", error);
          } else {
            console.log("Commuter store hydrated");
          }

          useCommuterStore.getState().setHasHydrated(true);
        };
      },
    },
  ),
);
