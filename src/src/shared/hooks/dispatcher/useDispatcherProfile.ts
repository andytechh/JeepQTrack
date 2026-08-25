import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/src/shared/config/supabase";

export type DispatcherRole = "admin" | "dispatcher" | "driver";

export type DispatcherProfile = {
  id: string;
  display_name: string;
  email: string;
  phone_number: string | null;
  role: DispatcherRole;
  avatar_url: string | null;
  preferred_terminal: number | null;
  preferred_bracket: number | null;
  expo_push_token: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type UseDispatcherProfileReturn = {
  profile: DispatcherProfile | null;
  loading: boolean;
  refreshing: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateProfile: (data: {
    display_name: string;
    phone_number: string;
  }) => Promise<{
    success: boolean;
    profile: DispatcherProfile | null;
    error: string | null;
  }>;
  updateAvatar: (avatarUrl: string) => Promise<{
    success: boolean;
    profile: DispatcherProfile | null;
    error: string | null;
  }>;
  updatePushToken: (token: string | null) => Promise<{
    success: boolean;
    profile: DispatcherProfile | null;
    error: string | null;
  }>;
};

const PROFILE_COLUMNS = `
  id,
  display_name,
  email,
  phone_number,
  role,
  avatar_url,
  preferred_terminal,
  preferred_bracket,
  expo_push_token,
  created_at,
  updated_at
`;

export function useDispatcherProfile(): UseDispatcherProfileReturn {
  const [profile, setProfile] = useState<DispatcherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error: profileError } = await supabase
        .from("users")
        .select(PROFILE_COLUMNS)
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!data) {
        setProfile(null);
        setError("Your dispatcher profile could not be found.");
        return;
      }

      if (data.role !== "dispatcher") {
        // Loaded account exists but isn't actually a dispatcher —
        // surface this clearly rather than silently defaulting the
        // role, since that would misrepresent who's signed in.
        console.warn(
          `useDispatcherProfile: loaded profile has role "${data.role}", expected "dispatcher".`,
        );
      }

      const normalizedProfile: DispatcherProfile = {
        id: data.id,
        display_name: data.display_name ?? "",
        email: data.email ?? user.email ?? "",
        phone_number: data.phone_number ?? null,
        role:
          data.role === "admin" ||
          data.role === "dispatcher" ||
          data.role === "driver"
            ? data.role
            : "dispatcher",
        avatar_url: data.avatar_url ?? null,
        preferred_terminal: data.preferred_terminal ?? null,
        preferred_bracket: data.preferred_bracket ?? null,
        expo_push_token: data.expo_push_token ?? null,
        created_at: data.created_at ?? null,
        updated_at: data.updated_at ?? null,
      };

      setProfile(normalizedProfile);
    } catch (err) {
      console.error("Failed to load dispatcher profile:", err);

      setProfile(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your dispatcher profile.",
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    if (refreshing) return;

    try {
      setRefreshing(true);
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile, refreshing]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setLoading(true);

        if (mounted) {
          await loadProfile();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [loadProfile]);

  const updateProfile = useCallback(
    async ({
      display_name,
      phone_number,
    }: {
      display_name: string;
      phone_number: string;
    }) => {
      if (!profile) {
        return {
          success: false,
          profile: null,
          error: "Profile is not available.",
        };
      }

      try {
        setSaving(true);
        setError(null);

        const trimmedName = display_name.trim();
        const trimmedPhone = phone_number.trim();

        if (!trimmedName) {
          return {
            success: false,
            profile,
            error: "Name is required.",
          };
        }

        const { data, error: updateError } = await supabase
          .from("users")
          .update({
            display_name: trimmedName,
            phone_number: trimmedPhone || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id)
          .select(PROFILE_COLUMNS)
          .single();

        if (updateError) {
          throw updateError;
        }

        const updatedProfile: DispatcherProfile = {
          ...profile,
          display_name: data.display_name ?? trimmedName,
          email: data.email ?? profile.email,
          phone_number: data.phone_number ?? null,
          role:
            data.role === "admin" ||
            data.role === "dispatcher" ||
            data.role === "driver"
              ? data.role
              : profile.role,
          avatar_url: data.avatar_url ?? profile.avatar_url,
          preferred_terminal:
            data.preferred_terminal ?? profile.preferred_terminal,
          preferred_bracket:
            data.preferred_bracket ?? profile.preferred_bracket,
          expo_push_token: data.expo_push_token ?? profile.expo_push_token,
          created_at: data.created_at ?? profile.created_at,
          updated_at: data.updated_at ?? new Date().toISOString(),
        };

        setProfile(updatedProfile);

        return {
          success: true,
          profile: updatedProfile,
          error: null,
        };
      } catch (err) {
        console.error("Failed to update dispatcher profile:", err);

        const message =
          err instanceof Error ? err.message : "Unable to update your profile.";

        setError(message);

        return {
          success: false,
          profile,
          error: message,
        };
      } finally {
        setSaving(false);
      }
    },
    [profile],
  );

  const updateAvatar = useCallback(
    async (avatarUrl: string) => {
      if (!profile) {
        return {
          success: false,
          profile: null,
          error: "Profile is not available.",
        };
      }

      try {
        setSaving(true);
        setError(null);

        const { data, error: updateError } = await supabase
          .from("users")
          .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id)
          .select(PROFILE_COLUMNS)
          .single();

        if (updateError) {
          throw updateError;
        }

        const updatedProfile: DispatcherProfile = {
          ...profile,
          display_name: data.display_name ?? profile.display_name,
          email: data.email ?? profile.email,
          phone_number: data.phone_number ?? profile.phone_number,
          role:
            data.role === "admin" ||
            data.role === "dispatcher" ||
            data.role === "driver"
              ? data.role
              : profile.role,
          avatar_url: data.avatar_url ?? avatarUrl,
          preferred_terminal:
            data.preferred_terminal ?? profile.preferred_terminal,
          preferred_bracket:
            data.preferred_bracket ?? profile.preferred_bracket,
          expo_push_token: data.expo_push_token ?? profile.expo_push_token,
          created_at: data.created_at ?? profile.created_at,
          updated_at: data.updated_at ?? new Date().toISOString(),
        };

        setProfile(updatedProfile);

        return {
          success: true,
          profile: updatedProfile,
          error: null,
        };
      } catch (err) {
        console.error("Failed to update dispatcher avatar:", err);

        const message =
          err instanceof Error
            ? err.message
            : "Unable to update your profile picture.";

        setError(message);

        return {
          success: false,
          profile,
          error: message,
        };
      } finally {
        setSaving(false);
      }
    },
    [profile],
  );

  const updatePushToken = useCallback(
    async (token: string | null) => {
      if (!profile) {
        return {
          success: false,
          profile: null,
          error: "Profile is not available.",
        };
      }

      try {
        setSaving(true);
        setError(null);

        const { data, error: updateError } = await supabase
          .from("users")
          .update({
            expo_push_token: token,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id)
          .select(PROFILE_COLUMNS)
          .single();

        if (updateError) {
          throw updateError;
        }

        const updatedProfile: DispatcherProfile = {
          ...profile,
          display_name: data.display_name ?? profile.display_name,
          email: data.email ?? profile.email,
          phone_number: data.phone_number ?? profile.phone_number,
          role:
            data.role === "admin" ||
            data.role === "dispatcher" ||
            data.role === "driver"
              ? data.role
              : profile.role,
          avatar_url: data.avatar_url ?? profile.avatar_url,
          preferred_terminal:
            data.preferred_terminal ?? profile.preferred_terminal,
          preferred_bracket:
            data.preferred_bracket ?? profile.preferred_bracket,
          expo_push_token: data.expo_push_token ?? token,
          created_at: data.created_at ?? profile.created_at,
          updated_at: data.updated_at ?? new Date().toISOString(),
        };

        setProfile(updatedProfile);

        return {
          success: true,
          profile: updatedProfile,
          error: null,
        };
      } catch (err) {
        console.error("Failed to update push token:", err);

        const message =
          err instanceof Error
            ? err.message
            : "Unable to update notification settings.";

        setError(message);

        return {
          success: false,
          profile,
          error: message,
        };
      } finally {
        setSaving(false);
      }
    },
    [profile],
  );

  return {
    profile,
    loading,
    refreshing,
    saving,
    error,
    refresh,
    updateProfile,
    updateAvatar,
    updatePushToken,
  };
}
