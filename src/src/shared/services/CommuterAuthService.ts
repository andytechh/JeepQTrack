// THIS IS THE FINAL VERSION TO USE — replaces both your original
// CommuterAuthService.ts and the earlier OTP-based rewrite. Save this as
// src/shared/services/CommuterAuthService.ts.
import { supabase } from "../config/supabase";

export interface CompleteCommuterProfileInput {
  name: string;
  mobile: string;
  notificationsEnabled: boolean;
  expoPushToken?: string | null;
}

export interface CommuterProfile {
  id: string;
  email: string;
  phone_number: string | null;
  display_name: string;
  role: "commuter";
  avatar_url: string | null;
  is_active: boolean;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompleteCommuterProfileResult {
  success: boolean;
  existing?: boolean;
  userId?: string;
  user?: CommuterProfile;
  error?: string;
}

const COMMUTER_SELECT = `
  id,
  email,
  phone_number,
  display_name,
  role,
  avatar_url,
  is_active,
  expo_push_token,
  created_at,
  updated_at
`;

/**
 * EPHEMERAL COMMUTER ACCOUNTS
 * ---------------------------
 * Commuter accounts are intentionally NOT persistent identities. Each
 * install/session is an anonymous Supabase auth user tied 1:1 to exactly
 * one `users` row. There is no name/phone "login" — phone_number is just
 * a contact field for notifications, not a credential, and it is no
 * longer unique for commuters (see 02_ephemeral_commuter_accounts.sql).
 *
 * Signing out DELETES the row permanently — that's the whole point: no
 * SMS/OTP cost, no cross-device identity to protect, because there's
 * nothing left to steal once you're gone. Make sure any UI that triggers
 * signOut() makes this permanence obvious to the user.
 */
export class CommuterAuthService {
  static async ensureAnonymousSession() {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error checking session:", sessionError);
        return { success: false, user: null, error: sessionError.message };
      }

      if (session?.user) {
        return { success: true, user: session.user };
      }

      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        console.error("Anonymous authentication failed:", error);
        return { success: false, user: null, error: error.message };
      }

      if (!data.user) {
        return {
          success: false,
          user: null,
          error: "Supabase did not return an anonymous user.",
        };
      }

      return { success: true, user: data.user };
    } catch (error: any) {
      console.error("ensureAnonymousSession exception:", error);
      return {
        success: false,
        user: null,
        error: error?.message || "Unable to create commuter session.",
      };
    }
  }

  static async getCommuterById(
    userId: string,
  ): Promise<CommuterProfile | null> {
    try {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("users")
        .select(COMMUTER_SELECT)
        .eq("id", userId)
        .eq("role", "commuter")
        .maybeSingle();

      if (error) {
        console.error("Failed to get commuter:", error);
        return null;
      }

      return data as CommuterProfile | null;
    } catch (error) {
      console.error("getCommuterById exception:", error);
      return null;
    }
  }

  /**
   * Checks whether the CURRENT device session already has a completed
   * profile — this only ever matches this device's own anonymous
   * session, never anyone else's. Used to show "Welcome back" instead of
   * re-onboarding on the SAME device/session.
   */
  static async checkExistingCommuter(): Promise<CommuterProfile | null> {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "checkExistingCommuter session check failed:",
          sessionError,
        );
        return null;
      }

      if (!session?.user) return null;

      return await this.getCommuterById(session.user.id);
    } catch (error) {
      console.error("checkExistingCommuter exception:", error);
      return null;
    }
  }

  /**
   * Creates or updates the profile row for the CURRENT anonymous session.
   * No phone-number lookup across other sessions, no id reassignment —
   * each session owns exactly one row, always.
   */
  static async completeCommuterProfile(
    input: CompleteCommuterProfileInput,
  ): Promise<CompleteCommuterProfileResult> {
    try {
      const name = input.name.trim();
      const mobile = input.mobile.trim();

      if (!name) return { success: false, error: "Name is required." };
      if (!mobile)
        return { success: false, error: "Mobile number is required." };

      const authResult = await this.ensureAnonymousSession();

      if (!authResult.success || !authResult.user) {
        return {
          success: false,
          error: authResult.error || "Unable to create commuter session.",
        };
      }

      const userId = authResult.user.id;

      const { data: currentProfile, error: currentProfileError } =
        await supabase
          .from("users")
          .select(COMMUTER_SELECT)
          .eq("id", userId)
          .maybeSingle();

      if (currentProfileError) {
        console.error("Failed to check current commuter:", currentProfileError);
        return { success: false, error: currentProfileError.message };
      }

      if (currentProfile) {
        const updatePayload: Record<string, any> = {
          display_name: name,
          phone_number: mobile,
          is_active: true,
        };

        if (input.expoPushToken) {
          updatePayload.expo_push_token = input.expoPushToken;
        }

        const { data: updated, error: updateError } = await supabase
          .from("users")
          .update(updatePayload)
          .eq("id", userId)
          .select(COMMUTER_SELECT)
          .maybeSingle();

        if (updateError) {
          console.error("Failed to update current commuter:", updateError);
          return { success: false, error: updateError.message };
        }

        return {
          success: true,
          existing: true,
          userId,
          user: (updated ?? currentProfile) as CommuterProfile,
        };
      }

      const internalEmail = `commuter-${userId}@smartqueue.local`;

      const insertPayload: Record<string, any> = {
        id: userId,
        email: internalEmail,
        phone_number: mobile,
        display_name: name,
        role: "commuter",
        is_active: true,
      };

      if (input.expoPushToken) {
        insertPayload.expo_push_token = input.expoPushToken;
      }

      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert(insertPayload)
        .select(COMMUTER_SELECT)
        .maybeSingle();

      if (insertError) {
        console.error("Failed to create commuter profile:", insertError);
        return { success: false, error: insertError.message };
      }

      if (!newUser) {
        return {
          success: false,
          error: "The commuter profile was created but could not be retrieved.",
        };
      }

      return {
        success: true,
        existing: false,
        userId: newUser.id,
        user: newUser as CommuterProfile,
      };
    } catch (error: any) {
      console.error("completeCommuterProfile exception:", error);
      return {
        success: false,
        error: error?.message || "Unable to complete commuter onboarding.",
      };
    }
  }

  static async getCurrentCommuter(): Promise<CommuterProfile | null> {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) return null;

      return await this.getCommuterById(authUser.id);
    } catch (error) {
      console.error("getCurrentCommuter exception:", error);
      return null;
    }
  }

  static async updateCommuterProfile(updates: {
    name?: string;
    mobile?: string;
  }): Promise<CompleteCommuterProfileResult> {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        return { success: false, error: "No authenticated commuter session." };
      }

      const payload: Record<string, any> = {};

      if (updates.name !== undefined) {
        const name = updates.name.trim();
        if (!name) return { success: false, error: "Name cannot be empty." };
        payload.display_name = name;
      }

      if (updates.mobile !== undefined) {
        const mobile = updates.mobile.trim();
        if (!mobile) {
          return { success: false, error: "Mobile number cannot be empty." };
        }
        // Safe to allow now: phone_number is not a security credential for
        // commuters and is no longer subject to a uniqueness constraint.
        payload.phone_number = mobile;
      }

      if (Object.keys(payload).length === 0) {
        return { success: false, error: "No profile changes provided." };
      }

      const { data, error } = await supabase
        .from("users")
        .update(payload)
        .eq("id", authUser.id)
        .eq("role", "commuter")
        .select(COMMUTER_SELECT)
        .single();

      if (error) {
        console.error("Failed to update commuter:", error);
        return { success: false, error: error.message };
      }

      return { success: true, userId: data.id, user: data as CommuterProfile };
    } catch (error: any) {
      console.error("updateCommuterProfile exception:", error);
      return {
        success: false,
        error: error?.message || "Unable to update commuter profile.",
      };
    }
  }

  static async saveExpoPushToken(expoPushToken: string): Promise<boolean> {
    try {
      if (!expoPushToken.trim()) return false;

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        console.error("Cannot save push token: no authenticated user.");
        return false;
      }

      const { error } = await supabase
        .from("users")
        .update({ expo_push_token: expoPushToken.trim() })
        .eq("id", authUser.id)
        .eq("role", "commuter");

      if (error) {
        console.error("Failed to save Expo push token:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("saveExpoPushToken exception:", error);
      return false;
    }
  }

  static async hasCompletedProfile(): Promise<boolean> {
    const commuter = await this.getCurrentCommuter();
    return !!commuter;
  }

  /**
   * Permanently deletes the current commuter's profile row, then ends the
   * session. This is a destructive action by design — there is no
   * recovery, no "log back in" with the same identity. Call sites (e.g.
   * the profile screen's Sign Out button) MUST make this clear to the
   * user before calling it.
   *
   * The delete happens BEFORE signOut() because the RLS delete policy
   * requires auth.uid() = id — once signed out, there's no session left
   * to prove ownership.
   */
  static async signOut(): Promise<boolean> {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { error: deleteError } = await supabase
          .from("users")
          .delete()
          .eq("id", authUser.id)
          .eq("role", "commuter");

        if (deleteError) {
          // Log but don't block sign-out on this — worst case a stale row
          // is left behind, which is a cleanup issue, not a security one
          // (it's not reachable by any future session).
          console.error(
            "Failed to delete commuter profile on sign out:",
            deleteError,
          );
        }
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Commuter sign out error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("signOut exception:", error);
      return false;
    }
  }
}

export const ensureAnonymousSession = () =>
  CommuterAuthService.ensureAnonymousSession();

export const getCommuterById = (userId: string) =>
  CommuterAuthService.getCommuterById(userId);

export const checkExistingCommuter = () =>
  CommuterAuthService.checkExistingCommuter();

export const completeCommuterProfile = (input: CompleteCommuterProfileInput) =>
  CommuterAuthService.completeCommuterProfile(input);

export const getCurrentCommuter = () =>
  CommuterAuthService.getCurrentCommuter();

export const updateCommuterProfile = (updates: {
  name?: string;
  mobile?: string;
}) => CommuterAuthService.updateCommuterProfile(updates);

export const saveExpoPushToken = (expoPushToken: string) =>
  CommuterAuthService.saveExpoPushToken(expoPushToken);

export const hasCompletedProfile = () =>
  CommuterAuthService.hasCompletedProfile();

export const signOutCommuter = () => CommuterAuthService.signOut();
