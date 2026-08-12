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

export class CommuterAuthService {
  static async ensureAnonymousSession() {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error checking anonymous session:", sessionError);

        return {
          success: false,
          user: null,
          error: sessionError.message,
        };
      }

      if (session?.user) {
        return {
          success: true,
          user: session.user,
        };
      }

      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        console.error("Anonymous authentication failed:", error);

        return {
          success: false,
          user: null,
          error: error.message,
        };
      }

      if (!data.user) {
        return {
          success: false,
          user: null,
          error: "Supabase did not return an anonymous user.",
        };
      }

      return {
        success: true,
        user: data.user,
      };
    } catch (error: any) {
      console.error("ensureAnonymousSession exception:", error);

      return {
        success: false,
        user: null,
        error: error?.message || "Unable to create anonymous commuter session.",
      };
    }
  }

  static async findCommuterByPhone(
    mobile: string,
  ): Promise<CommuterProfile | null> {
    try {
      const normalizedMobile = mobile.trim();

      if (!normalizedMobile) {
        return null;
      }

      const { data, error } = await supabase
        .from("users")
        .select(COMMUTER_SELECT)
        .eq("phone_number", normalizedMobile)
        .eq("role", "commuter")
        .maybeSingle();

      if (error) {
        console.error("Failed to check commuter by phone:", error);

        return null;
      }

      return data as CommuterProfile | null;
    } catch (error) {
      console.error("findCommuterByPhone exception:", error);

      return null;
    }
  }

  static async getCommuterById(
    userId: string,
  ): Promise<CommuterProfile | null> {
    try {
      if (!userId) {
        return null;
      }

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
   * Checks whether the *current device session* already has a completed
   * commuter profile. Used on the onboarding "name" screen to decide whether
   * to show the "Welcome back" modal instead of re-onboarding the user.
   *
   * Returns null if there's no session, no matching profile, or on error —
   * all of which mean "treat this as a new commuter."
   */
  static async checkExistingCommuter(): Promise<CommuterProfile | null> {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "checkExistingCommuter: session check failed:",
          sessionError,
        );
        return null;
      }

      if (!session?.user) {
        // No persisted session — nothing to check yet.
        return null;
      }

      return await this.getCommuterById(session.user.id);
    } catch (error) {
      console.error("checkExistingCommuter exception:", error);
      return null;
    }
  }

  static async completeCommuterProfile(
    input: CompleteCommuterProfileInput,
  ): Promise<CompleteCommuterProfileResult> {
    try {
      const name = input.name.trim();
      const mobile = input.mobile.trim();

      if (!name) {
        return {
          success: false,
          error: "Name is required.",
        };
      }

      if (!mobile) {
        return {
          success: false,
          error: "Mobile number is required.",
        };
      }

      const authResult = await this.ensureAnonymousSession();

      if (!authResult.success || !authResult.user) {
        return {
          success: false,
          error:
            authResult.error || "Unable to create commuter authentication.",
        };
      }

      const userId = authResult.user.id;
      const internalEmail = `anonymous-${userId}@commuter.smartqueue.local`;

      const { data: currentProfile, error: currentProfileError } =
        await supabase
          .from("users")
          .select(COMMUTER_SELECT)
          .eq("id", userId)
          .eq("role", "commuter")
          .maybeSingle();

      if (currentProfileError) {
        console.error("Failed to check current commuter:", currentProfileError);

        return {
          success: false,
          error: currentProfileError.message,
        };
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

        const { error: updateError } = await supabase
          .from("users")
          .update(updatePayload)
          .eq("id", userId)
          .eq("role", "commuter");

        if (updateError) {
          console.error("Failed to update current commuter:", updateError);

          if (
            updateError.code === "23505" &&
            updateError.message.includes("users_phone_number_key")
          ) {
            return {
              success: false,
              error:
                "This mobile number is already registered to another commuter.",
            };
          }

          return {
            success: false,
            error: updateError.message,
          };
        }

        const updatedProfile: CommuterProfile = {
          ...currentProfile,
          display_name: name,
          phone_number: mobile,
          is_active: true,
          expo_push_token:
            input.expoPushToken ?? currentProfile.expo_push_token,
        };

        return {
          success: true,
          existing: true,
          userId,
          user: updatedProfile,
        };
      }

      const { data: phoneOwner, error: phoneOwnerError } = await supabase
        .from("users")
        .select(COMMUTER_SELECT)
        .eq("phone_number", mobile)
        .eq("role", "commuter")
        .maybeSingle();

      if (phoneOwnerError) {
        console.error("Failed to check mobile number:", phoneOwnerError);

        return {
          success: false,
          error: phoneOwnerError.message,
        };
      }

      if (phoneOwner) {
        // The phone number belongs to an existing row, but it was created
        // under a DIFFERENT auth id than the current session (this happens
        // when the previous anonymous session was lost, e.g. app reinstall
        // or storage not persisted, and a new anonymous user was created).
        //
        // If we just return this row as-is, the current session (userId)
        // has no row it can query later — getCurrentCommuter() will keep
        // failing. Re-point the row's id to the current session so future
        // reads under this session succeed.
        if (phoneOwner.id !== userId) {
          const migratedProfile = await this.migrateProfileId(
            phoneOwner,
            userId,
            input.expoPushToken,
          );

          if (migratedProfile) {
            return {
              success: true,
              existing: true,
              userId: migratedProfile.id,
              user: migratedProfile,
            };
          }

          // Migration failed (e.g. FK constraints elsewhere) — fall back to
          // the old behavior. The caller still gets a usable profile now,
          // but a future load under this session may not find it again.
          console.warn(
            "completeCommuterProfile: id migration failed, returning original row without reassigning id.",
          );

          return {
            success: true,
            existing: true,
            userId: phoneOwner.id,
            user: {
              ...phoneOwner,
              expo_push_token:
                input.expoPushToken ?? phoneOwner.expo_push_token,
            } as CommuterProfile,
          };
        }

        if (input.expoPushToken) {
          const { error: tokenError } = await supabase
            .from("users")
            .update({
              expo_push_token: input.expoPushToken,
            })
            .eq("id", phoneOwner.id);

          if (tokenError) {
            console.error(
              "Failed to update existing commuter token:",
              tokenError,
            );
          }
        }

        return {
          success: true,
          existing: true,
          userId: phoneOwner.id,
          user: {
            ...phoneOwner,
            expo_push_token: input.expoPushToken ?? phoneOwner.expo_push_token,
          } as CommuterProfile,
        };
      }

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

        if (
          insertError.code === "23505" &&
          insertError.message.includes("users_phone_number_key")
        ) {
          const existingCommuter = await this.findCommuterByPhone(mobile);

          if (existingCommuter) {
            return {
              success: true,
              existing: true,
              userId: existingCommuter.id,
              user: existingCommuter,
            };
          }

          return {
            success: false,
            error:
              "This mobile number is already registered to another commuter.",
          };
        }

        if (
          insertError.code === "23505" &&
          insertError.message.includes("users_pkey")
        ) {
          const existingProfile = await this.getCommuterById(userId);

          if (existingProfile) {
            return {
              success: true,
              existing: true,
              userId: existingProfile.id,
              user: existingProfile,
            };
          }
        }

        return {
          success: false,
          error: insertError.message,
        };
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

  /**
   * Re-points an existing commuter row's primary key to a new auth id.
   * See the caveat in the class doc comment above about FK dependencies
   * on users(id) elsewhere in the schema.
   */
  private static async migrateProfileId(
    existingProfile: CommuterProfile,
    newId: string,
    expoPushToken?: string | null,
  ): Promise<CommuterProfile | null> {
    try {
      const updatePayload: Record<string, any> = {
        id: newId,
      };

      if (expoPushToken) {
        updatePayload.expo_push_token = expoPushToken;
      }

      const { data, error } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", existingProfile.id)
        .eq("role", "commuter")
        .select(COMMUTER_SELECT)
        .maybeSingle();

      if (error) {
        console.error("migrateProfileId failed:", error);
        return null;
      }

      return data as CommuterProfile | null;
    } catch (error) {
      console.error("migrateProfileId exception:", error);
      return null;
    }
  }

  static async getCurrentCommuter(): Promise<CommuterProfile | null> {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        return null;
      }

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
        return {
          success: false,
          error: "No authenticated commuter session.",
        };
      }

      const payload: Record<string, any> = {};

      if (updates.name !== undefined) {
        const name = updates.name.trim();

        if (!name) {
          return {
            success: false,
            error: "Name cannot be empty.",
          };
        }

        payload.display_name = name;
      }

      if (updates.mobile !== undefined) {
        const mobile = updates.mobile.trim();

        if (!mobile) {
          return {
            success: false,
            error: "Mobile number cannot be empty.",
          };
        }

        payload.phone_number = mobile;
      }

      if (Object.keys(payload).length === 0) {
        return {
          success: false,
          error: "No profile changes provided.",
        };
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

        if (
          error.code === "23505" &&
          error.message.includes("users_phone_number_key")
        ) {
          return {
            success: false,
            error:
              "This mobile number is already registered to another commuter.",
          };
        }

        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        userId: data.id,
        user: data as CommuterProfile,
      };
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
      if (!expoPushToken.trim()) {
        return false;
      }

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
        .update({
          expo_push_token: expoPushToken.trim(),
        })
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

  static async saveExpoPushTokenForCommuter(
    userId: string,
    expoPushToken: string,
  ): Promise<boolean> {
    try {
      if (!userId || !expoPushToken.trim()) {
        return false;
      }

      const { error } = await supabase
        .from("users")
        .update({
          expo_push_token: expoPushToken.trim(),
        })
        .eq("id", userId)
        .eq("role", "commuter");

      if (error) {
        console.error("Failed to save commuter Expo token:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("saveExpoPushTokenForCommuter exception:", error);
      return false;
    }
  }

  static async hasCompletedProfile(): Promise<boolean> {
    const commuter = await this.getCurrentCommuter();
    return !!commuter;
  }

  static async signOut(): Promise<boolean> {
    try {
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

export const findCommuterByPhone = (mobile: string) =>
  CommuterAuthService.findCommuterByPhone(mobile);

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

export const saveExpoPushTokenForCommuter = (
  userId: string,
  expoPushToken: string,
) => CommuterAuthService.saveExpoPushTokenForCommuter(userId, expoPushToken);

export const hasCompletedProfile = () =>
  CommuterAuthService.hasCompletedProfile();

export const signOutCommuter = () => CommuterAuthService.signOut();
