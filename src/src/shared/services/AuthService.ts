// src/shared/services/AuthService.ts
import { AuthError } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import { User } from "../types";

const isSessionMissingError = (error: unknown): boolean =>
  error instanceof AuthError && error.name === "AuthSessionMissingError";

export class AuthService {
  static async login(credentials: {
    email: string;
    password: string;
  }): Promise<User> {
    return this.signInWithEmail(credentials.email, credentials.password);
  }

  static async signInWithEmail(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) throw error;
    if (!data?.user) throw new Error("No user data returned");

    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      console.error("Failed to load user profile after sign in:", profileError);
    }

    return {
      uid: data.user.id,
      email: data.user.email!,
      displayName:
        userData?.display_name || data.user.user_metadata?.display_name || "",
      phoneNumber: userData?.phone_number || null,
      role: userData?.role || data.user.user_metadata?.role || "commuter",
      jeepneyId: userData?.jeepney_id || null,
      isActive: userData?.is_active ?? true,
    };
  }

  static async signUp(data: {
    email: string;
    password: string;
    displayName: string;
    role?: string;
  }): Promise<User> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password.trim(),
      options: {
        data: {
          display_name: data.displayName,
          role: data.role || "driver",
        },
      },
    });

    if (authError) throw authError;
    if (!authData?.user) throw new Error("No user data returned");

    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        email: authData.user.email!,
        display_name: data.displayName,
        role: data.role || "driver",
        is_active: true,
      })
      .select()
      .single();

    if (userError) throw userError;

    return {
      uid: authData.user.id,
      email: authData.user.email!,
      displayName: userData.display_name,
      phoneNumber: userData.phone_number,
      role: userData.role,
      jeepneyId: userData.jeepney_id,
      isActive: userData.is_active,
    };
  }

  static async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "smartqs-staff://reset-password",
    });

    if (error) throw error;
  }

  static async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  }

  static async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      // Signing out with no active session is not a real failure.
      if (isSessionMissingError(error)) return;
      throw error;
    }
  }

  /**
   * Returns the current authenticated user, or null if there isn't one.
   * A missing session (logged out / fresh install) is an EXPECTED state,
   * not an error — getUser() can reject with AuthSessionMissingError
   * instead of returning it in `error`, so this must be try/caught, not
   * just destructured.
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) return null;

      const { data: userData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Failed to load user profile:", profileError);
      }

      return {
        uid: user.id,
        email: user.email!,
        displayName:
          userData?.display_name || user.user_metadata?.display_name || "",
        phoneNumber: userData?.phone_number || null,
        role: userData?.role || user.user_metadata?.role || "commuter",
        jeepneyId: userData?.jeepney_id || null,
        isActive: userData?.is_active ?? true,
      };
    } catch (error) {
      if (isSessionMissingError(error)) {
        // No session at all — normal for a logged-out user, not a real error.
        return null;
      }
      console.error("getCurrentUser failed:", error);
      return null;
    }
  }
}
