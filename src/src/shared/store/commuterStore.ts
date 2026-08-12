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

      storage: createJSONStorage(() => AsyncStorage),

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
