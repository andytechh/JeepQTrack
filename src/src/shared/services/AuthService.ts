// src/shared/services/AuthService.ts
import { supabase } from "../config/supabase";
import { User } from "../types";

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

    // Get user profile
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

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
      redirectTo: "yourapp://reset-password", // Replace with your app's deep link
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

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
  }
}
