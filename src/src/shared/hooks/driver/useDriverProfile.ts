import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/src/shared/config/supabase";

export type DriverRole = "admin" | "dispatcher" | "driver" | "commuter";

export type AssignedJeepney = {
  id: string;
  plate_number: string;
  jeep_name: string | null;
  bracket: number;
  terminal_id: number | null;
  status: string | null;
  capacity: number | null;
};

export type DriverProfile = {
  id: string;
  display_name: string;
  email: string;
  phone_number: string | null;
  role: DriverRole;
  avatar_url: string | null;
  preferred_terminal: number | null;
  preferred_bracket: number | null;
  jeepney_id: string | null;
  jeepney: AssignedJeepney | null;
  expo_push_token: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type UseDriverProfileReturn = {
  profile: DriverProfile | null;
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
    profile: DriverProfile | null;
    error: string | null;
  }>;
  updateAvatar: (avatarUrl: string) => Promise<{
    success: boolean;
    profile: DriverProfile | null;
    error: string | null;
  }>;
  updatePushToken: (token: string | null) => Promise<{
    success: boolean;
    profile: DriverProfile | null;
    error: string | null;
  }>;
};

// The assigned vehicle isn't a column on "users" — it's the
// jeepneys row linked via users.jeepney_id. There are two FKs
// between these tables (users.jeepney_id -> jeepneys.id, and
// jeepneys.driver_id -> users.id), so the embed below names the
// constraint explicitly to avoid PostgREST ambiguity.
const PROFILE_COLUMNS = `
  id,
  display_name,
  email,
  phone_number,
  role,
  avatar_url,
  preferred_terminal,
  preferred_bracket,
  jeepney_id,
  expo_push_token,
  created_at,
  updated_at,
  jeepney:jeepneys!users_jeepney_id_fkey (
    id,
    plate_number,
    jeep_name,
    bracket,
    terminal_id,
    status,
    capacity
  )
`;

function normalizeRole(role: unknown, fallback: DriverRole): DriverRole {
  return role === "admin" ||
    role === "dispatcher" ||
    role === "driver" ||
    role === "commuter"
    ? role
    : fallback;
}

function normalizeJeepney(raw: unknown): AssignedJeepney | null {
  // Supabase returns the embedded relation as an object for a
  // to-one FK, but as an array in some client/query shapes — handle
  // both defensively.
  const jeepney: any = Array.isArray(raw) ? raw[0] : raw;

  if (!jeepney) {
    return null;
  }

  return {
    id: jeepney.id,
    plate_number: jeepney.plate_number,
    jeep_name: jeepney.jeep_name ?? null,
    bracket: jeepney.bracket,
    terminal_id: jeepney.terminal_id ?? null,
    status: jeepney.status ?? null,
    capacity: jeepney.capacity ?? null,
  };
}

export function useDriverProfile(): UseDriverProfileReturn {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
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
        setError("Your driver profile could not be found.");
        return;
      }

      if (data.role !== "driver") {
        // Loaded account exists but isn't actually a driver —
        // surface this clearly rather than silently defaulting the
        // role, since that would misrepresent who's signed in.
        console.warn(
          `useDriverProfile: loaded profile has role "${data.role}", expected "driver".`,
        );
      }

      const normalizedProfile: DriverProfile = {
        id: data.id,
        display_name: data.display_name ?? "",
        email: data.email ?? user.email ?? "",
        phone_number: data.phone_number ?? null,
        role: normalizeRole(data.role, "driver"),
        avatar_url: data.avatar_url ?? null,
        preferred_terminal: data.preferred_terminal ?? null,
        preferred_bracket: data.preferred_bracket ?? null,
        jeepney_id: data.jeepney_id ?? null,
        jeepney: normalizeJeepney(data.jeepney),
        expo_push_token: data.expo_push_token ?? null,
        created_at: data.created_at ?? null,
        updated_at: data.updated_at ?? null,
      };

      setProfile(normalizedProfile);
    } catch (err) {
      console.error("Failed to load driver profile:", err);

      setProfile(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your driver profile.",
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

        const updatedProfile: DriverProfile = {
          ...profile,
          display_name: data.display_name ?? trimmedName,
          email: data.email ?? profile.email,
          phone_number: data.phone_number ?? null,
          role: normalizeRole(data.role, profile.role),
          avatar_url: data.avatar_url ?? profile.avatar_url,
          preferred_terminal:
            data.preferred_terminal ?? profile.preferred_terminal,
          preferred_bracket:
            data.preferred_bracket ?? profile.preferred_bracket,
          jeepney_id: data.jeepney_id ?? profile.jeepney_id,
          jeepney: normalizeJeepney(data.jeepney) ?? profile.jeepney,
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
        console.error("Failed to update driver profile:", err);

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

        const updatedProfile: DriverProfile = {
          ...profile,
          display_name: data.display_name ?? profile.display_name,
          email: data.email ?? profile.email,
          phone_number: data.phone_number ?? profile.phone_number,
          role: normalizeRole(data.role, profile.role),
          avatar_url: data.avatar_url ?? avatarUrl,
          preferred_terminal:
            data.preferred_terminal ?? profile.preferred_terminal,
          preferred_bracket:
            data.preferred_bracket ?? profile.preferred_bracket,
          jeepney_id: data.jeepney_id ?? profile.jeepney_id,
          jeepney: normalizeJeepney(data.jeepney) ?? profile.jeepney,
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
        console.error("Failed to update driver avatar:", err);

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

        const updatedProfile: DriverProfile = {
          ...profile,
          display_name: data.display_name ?? profile.display_name,
          email: data.email ?? profile.email,
          phone_number: data.phone_number ?? profile.phone_number,
          role: normalizeRole(data.role, profile.role),
          avatar_url: data.avatar_url ?? profile.avatar_url,
          preferred_terminal:
            data.preferred_terminal ?? profile.preferred_terminal,
          preferred_bracket:
            data.preferred_bracket ?? profile.preferred_bracket,
          jeepney_id: data.jeepney_id ?? profile.jeepney_id,
          jeepney: normalizeJeepney(data.jeepney) ?? profile.jeepney,
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
