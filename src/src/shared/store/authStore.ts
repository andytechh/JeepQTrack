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
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  initializeAuthListener: () => () => void;
  refreshUser: () => Promise<void>;
}

let authListenerInitialized = false;

const mapDatabaseUser = (data: any, fallbackEmail?: string | null): User => ({
  uid: data.id,
  email: data.email ?? fallbackEmail ?? "",
  displayName: data.display_name ?? "",
  phoneNumber: data.phone_number ?? null,
  role: data.role,
  jeepneyId: data.jeepney_id ?? null,
  isActive: data.is_active ?? true,
  terminalId: data.preferred_terminal ?? 1,
});

const clearPersistedAuth = async () => {
  try {
    await AsyncStorage.removeItem("auth-storage");
  } catch (error) {
    console.error("Failed to clear persisted auth storage:", error);
  }
};

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

      setIsAuthenticated: (value) => {
        set({
          isAuthenticated: value,
        });
      },

      setIsLoading: (value) => {
        set({
          isLoading: value,
        });
      },

      logout: async () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });

        await clearPersistedAuth();

        try {
          const { error } = await supabase.auth.signOut();

          if (error) {
            console.error("Supabase sign out error:", error);
          }
        } catch (error) {
          console.error("Supabase sign out exception:", error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });

          await clearPersistedAuth();
        }
      },

      hydrate: async () => {
        try {
          set({
            isLoading: true,
          });

          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.error("Failed to restore Supabase session:", sessionError);

            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });

            await clearPersistedAuth();
            return;
          }

          if (!session?.user) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });

            await clearPersistedAuth();
            return;
          }

          const { data, error } = await supabase
            .from("users")
            .select(
              "id, email, display_name, phone_number, role, jeepney_id, is_active, preferred_terminal",
            )
            .eq("id", session.user.id)
            .maybeSingle();

          if (error) {
            console.error("Failed to restore user profile:", error);

            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });

            await clearPersistedAuth();
            return;
          }

          if (!data) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });

            await clearPersistedAuth();
            return;
          }

          const restoredUser = mapDatabaseUser(data, session.user.email);

          set({
            user: restoredUser,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error("Auth hydration error:", error);

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });

          await clearPersistedAuth();
        }
      },

      initializeAuthListener: () => {
        if (authListenerInitialized) {
          return () => {};
        }

        authListenerInitialized = true;

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_OUT" || !session?.user) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });

            void clearPersistedAuth();
            return;
          }

          if (
            event === "SIGNED_IN" ||
            event === "TOKEN_REFRESHED" ||
            event === "USER_UPDATED"
          ) {
            void get().hydrate();
          }
        });

        return () => {
          subscription.unsubscribe();
          authListenerInitialized = false;
        };
      },

      refreshUser: async () => {
        const currentUser = get().user;

        if (!currentUser?.uid) {
          return;
        }

        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.user) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });

            await clearPersistedAuth();
            return;
          }

          if (session.user.id !== currentUser.uid) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });

            await clearPersistedAuth();
            return;
          }

          const { data, error } = await supabase
            .from("users")
            .select(
              "id, email, display_name, phone_number, role, jeepney_id, is_active, preferred_terminal",
            )
            .eq("id", currentUser.uid)
            .maybeSingle();

          if (error) {
            throw error;
          }

          if (!data) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });

            await clearPersistedAuth();
            return;
          }

          const updatedUser = mapDatabaseUser(data, session.user.email);

          set({
            user: updatedUser,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error("Failed to refresh user:", error);
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
      }),
      onRehydrateStorage: () => {
        return () => {
          void useAuthStore.getState().hydrate();
        };
      },
    },
  ),
);
