import { supabase } from "@/src/shared/config/supabase";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getCurrentCommuter,
  signOutCommuter,
  updateCommuterProfile,
  type CommuterProfile,
} from "../services/CommuterAuthService";

const AVATAR_BUCKET = "avatars";

export type ProfileActionResult = {
  success: boolean;
  error?: string;
  /** Machine-readable reason, so the UI can pick the right alert copy
   *  without the hook needing to know about Alerts/Modals at all. */
  reason?:
    "permission_denied" | "canceled" | "missing_project_id" | "not_ready";
};

export type TogglePushResult = ProfileActionResult & { enabled?: boolean };

/**
 * All state + async logic for the commuter profile screen. Pure data/
 * side-effect layer — no Alerts, no Modals, no navigation. The screen
 * component owns presentation and decides what to show based on the
 * result objects these actions return.
 */
export function useProfile() {
  const [profile, setProfile] = useState<CommuterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const commuter = await getCurrentCommuter();
      if (!commuter) {
        setProfile(null);
        setAvatarUri(null);
        return;
      }
      setProfile(commuter);
      setName(commuter.display_name ?? "");
      setMobile(commuter.phone_number ?? "");
      setPushEnabled(!!commuter.expo_push_token);
      setAvatarUri(commuter.avatar_url ?? null);
    } catch (error) {
      console.error("Failed to load commuter profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    try {
      setRefreshing(true);
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loadProfile]);

  const startEditing = useCallback(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setMobile(profile.phone_number ?? "");
    setEditing(true);
  }, [profile]);

  const cancelEditing = useCallback(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setMobile(profile.phone_number ?? "");
    setEditing(false);
  }, [profile]);

  const save = useCallback(async (): Promise<ProfileActionResult> => {
    if (saving || !profile) {
      return { success: false, reason: "not_ready", error: "Not ready yet." };
    }

    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();

    if (!trimmedName) {
      return { success: false, error: "Please enter your name." };
    }
    if (!trimmedMobile) {
      return { success: false, error: "Please enter your mobile number." };
    }

    try {
      setSaving(true);
      const result = await updateCommuterProfile({
        name: trimmedName,
        mobile: trimmedMobile,
      });

      if (!result.success || !result.user) {
        return {
          success: false,
          error: result.error || "We couldn't update your profile.",
        };
      }

      setProfile(result.user);
      setName(result.user.display_name ?? "");
      setMobile(result.user.phone_number ?? "");
      setEditing(false);
      return { success: true };
    } catch (error) {
      console.error("Failed to update commuter profile:", error);
      return { success: false, error: "We couldn't update your profile." };
    } finally {
      setSaving(false);
    }
  }, [saving, profile, name, mobile]);

  const uploadAvatarFile = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split(".").pop() || "jpg";
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      const { error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, blob, { contentType: "image/jpeg" });

      if (error) {
        console.error("Upload error:", error);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Upload failed:", error);
      return null;
    }
  };

  const pickAndUploadAvatar =
    useCallback(async (): Promise<ProfileActionResult> => {
      try {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          return {
            success: false,
            reason: "permission_denied",
            error: "Allow photo access to choose a profile picture.",
          };
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.6,
        });

        if (result.canceled || !result.assets?.[0]?.uri) {
          return { success: false, reason: "canceled" };
        }

        const uri = result.assets[0].uri;
        setAvatarUri(uri); // preview immediately

        setUploadingAvatar(true);
        const uploadedUrl = await uploadAvatarFile(uri);

        if (!uploadedUrl) {
          setAvatarUri(profile?.avatar_url ?? null);
          return { success: false, error: "Could not upload avatar." };
        }

        const { error } = await supabase
          .from("users")
          .update({ avatar_url: uploadedUrl })
          .eq("id", profile?.id);

        if (error) {
          console.error("Failed to save avatar URL:", error);
          setAvatarUri(profile?.avatar_url ?? null);
          return { success: false, error: "Could not save avatar." };
        }

        if (profile) {
          setProfile({ ...profile, avatar_url: uploadedUrl });
        }
        setAvatarUri(uploadedUrl);
        return { success: true };
      } catch (error) {
        console.error("Failed to select profile image:", error);
        setAvatarUri(profile?.avatar_url ?? null);
        return { success: false, error: "Please try again." };
      } finally {
        setUploadingAvatar(false);
      }
    }, [profile]);

  const togglePush = useCallback(async (): Promise<TogglePushResult> => {
    if (togglingPush || !profile) {
      return { success: false, reason: "not_ready", error: "Not ready yet." };
    }

    try {
      setTogglingPush(true);

      if (pushEnabled) {
        const { error } = await supabase
          .from("users")
          .update({ expo_push_token: null })
          .eq("id", profile.id);
        if (error) throw error;
        setPushEnabled(false);
        return { success: true, enabled: false };
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        return {
          success: false,
          reason: "permission_denied",
          error: "Enable notifications in settings to receive alerts.",
        };
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        return {
          success: false,
          reason: "missing_project_id",
          error: "App configuration missing. Please contact support.",
        };
      }

      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      if (!token.data) {
        return { success: false, error: "Could not get push token." };
      }

      const { error } = await supabase
        .from("users")
        .update({ expo_push_token: token.data })
        .eq("id", profile.id);
      if (error) throw error;

      setPushEnabled(true);
      return { success: true, enabled: true };
    } catch (error) {
      console.error("Toggle push error:", error);
      return {
        success: false,
        error: "Could not update notification settings.",
      };
    } finally {
      setTogglingPush(false);
    }
  }, [togglingPush, profile, pushEnabled]);

  /**
   * Permanently deletes the commuter's profile (see
   * CommuterAuthService.signOut — this is the ephemeral-account model,
   * not a session pause). The screen is responsible for confirming with
   * the user BEFORE calling this, and for navigating away after.
   */
  const deleteProfile = useCallback(async (): Promise<ProfileActionResult> => {
    const success = await signOutCommuter();
    if (!success) {
      return { success: false, error: "Please try again." };
    }
    setProfile(null);
    return { success: true };
  }, []);

  const initials = useMemo(() => {
    const value = profile?.display_name?.trim() || name.trim();
    if (!value) return "SQ";
    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [profile?.display_name, name]);

  return {
    // state
    profile,
    loading,
    refreshing,
    editing,
    saving,
    uploadingAvatar,
    togglingPush,
    pushEnabled,
    name,
    setName,
    mobile,
    setMobile,
    avatarUri,
    initials,
    // actions
    refresh,
    startEditing,
    cancelEditing,
    save,
    pickAndUploadAvatar,
    togglePush,
    deleteProfile,
  };
}
