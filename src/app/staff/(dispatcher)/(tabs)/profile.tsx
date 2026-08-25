import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  Bell,
  BellOff,
  Calendar,
  Camera,
  ChevronRight,
  CircleHelp,
  Edit3,
  FileText,
  Info,
  ListStart,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Smartphone,
  UserRound,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "@/src/shared/components/clay/OceanBackground";
import { supabase } from "@/src/shared/config/supabase";
import { colors } from "@/src/shared/constants/theme";
import { useDispatcherProfile } from "@/src/shared/hooks/dispatcher/useDispatcherProfile";
import { useAuthStore } from "@/src/shared/store/authStore";

type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress: () => void;
};

type AlertConfig = {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
};

// Supabase Storage bucket avatars are uploaded to. Must exist and
// allow authenticated uploads/public reads — adjust to match your
// actual bucket name if it differs.
const AVATAR_BUCKET = "avatars";

export default function DispatcherProfileScreen() {
  const {
    profile,
    loading,
    refreshing,
    saving,
    error,
    refresh,
    updateProfile,
    updateAvatar,
    updatePushToken,
  } = useDispatcherProfile();

  const logout = useAuthStore((state) => state.logout);

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      buttons: AlertButton[] = [{ text: "OK", onPress: () => {} }],
    ) => {
      setAlertConfig({ visible: true, title, message, buttons });
    },
    [],
  );

  const hideAlert = useCallback(() => {
    setAlertConfig((previous) => ({ ...previous, visible: false }));
  }, []);

  useEffect(() => {
    setPushEnabled(Boolean(profile?.expo_push_token));
  }, [profile?.expo_push_token]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/staff/(dispatcher)/(tabs)");
  };

  /* ================================================================
     AVATAR UPLOAD
  ================================================================ */

  const handlePickAvatar = async () => {
    if (!profile || uploadingAvatar) {
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== "granted") {
        showAlert(
          "Permission required",
          "Please allow photo library access to update your profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const asset = result.assets[0];

      setUploadingAvatar(true);

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const fileExt = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
      const contentType = fileExt === "png" ? "image/png" : "image/jpeg";
      const filePath = `${profile.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, blob, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl;

      if (!publicUrl) {
        throw new Error("Could not resolve a public URL for the image.");
      }

      const updateResult = await updateAvatar(publicUrl);

      if (!updateResult.success) {
        throw new Error(
          updateResult.error || "Failed to save your new profile picture.",
        );
      }

      showAlert(
        "Profile picture updated",
        "Your new profile picture has been saved.",
      );
    } catch (err) {
      console.error("Avatar upload error:", err);

      showAlert(
        "Upload failed",
        err instanceof Error
          ? err.message
          : "We could not update your profile picture. Please try again.",
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  /* ================================================================
     EDIT PROFILE DETAILS
  ================================================================ */

  const handleStartEditing = () => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setPhoneNumber(profile.phone_number ?? "");
    setEditing(true);
  };

  const handleCancelEdit = () => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setPhoneNumber(profile.phone_number ?? "");
    setEditing(false);
  };

  const handleSave = async () => {
    if (saving || !profile) return;

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      showAlert("Name required", "Please enter your display name.");
      return;
    }

    const result = await updateProfile({
      display_name: trimmedName,
      phone_number: phoneNumber.trim(),
    });

    if (result.success) {
      setEditing(false);
      showAlert("Profile updated", "Your changes have been saved.");
    } else {
      showAlert(
        "Unable to save",
        result.error || "Something went wrong while saving your profile.",
      );
    }
  };

  /* ================================================================
     PUSH NOTIFICATIONS
  ================================================================ */

  const handleTogglePush = async () => {
    if (!profile || togglingPush) {
      return;
    }

    try {
      setTogglingPush(true);

      if (pushEnabled) {
        const result = await updatePushToken(null);

        if (!result.success) {
          throw new Error(
            result.error || "We could not update your notification settings.",
          );
        }

        setPushEnabled(false);
        showAlert(
          "Notifications disabled",
          "This device will no longer receive Smart Queue push notifications.",
        );
        return;
      }

      const permission = await Notifications.requestPermissionsAsync();

      if (permission.status !== "granted") {
        showAlert(
          "Permission required",
          "Notification permission is disabled for this device. Please allow notifications in your device settings.",
        );
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        showAlert(
          "Configuration error",
          "The Expo project ID is missing from the application configuration.",
        );
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({ projectId });

      if (!token.data) {
        showAlert(
          "Unable to enable notifications",
          "The device notification token could not be created.",
        );
        return;
      }

      const result = await updatePushToken(token.data);

      if (!result.success) {
        throw new Error(
          result.error || "We could not update your notification settings.",
        );
      }

      setPushEnabled(true);
      showAlert(
        "Notifications enabled",
        "This device will now receive Smart Queue push notifications.",
      );
    } catch (err) {
      console.error("Dispatcher notification toggle error:", err);

      showAlert(
        "Unable to update notifications",
        err instanceof Error
          ? err.message
          : "We could not update your notification settings. Please try again.",
      );
    } finally {
      setTogglingPush(false);
    }
  };

  /* ================================================================
     SIGN OUT
  ================================================================ */

  const handleSignOut = () => {
    showAlert(
      "Sign out",
      "Are you sure you want to sign out of the Smart Queue dispatcher application?",
      [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            if (signingOut) return;

            setSigningOut(true);

            // Clear local auth state and navigate immediately —
            // don't make the UI wait on the network call, since a
            // slow/hanging request would otherwise leave the user
            // stuck on this screen. The root layout's auth-guard
            // effect sees isAuthenticated === false right away and
            // won't redirect back into the dispatcher stack.
            logout();
            router.replace("/staff/login");

            try {
              const { error: signOutError } = await supabase.auth.signOut();

              if (signOutError) {
                console.error("Dispatcher sign out error:", signOutError);
              }
            } catch (err) {
              console.error("Dispatcher sign out error:", err);
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
    );
  };

  /* ================================================================
     LOADING / ERROR STATES
  ================================================================ */

  if (loading) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface shadow-clay">
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </View>

            <Text className="mt-4 text-[14px] font-extrabold text-ink-dark">
              Loading profile...
            </Text>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  if (!profile) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 px-5 pt-4">
            <Header onBack={handleBack} editing={false} onEdit={() => {}} />

            <View className="mt-8 items-center rounded-[28px] border border-white/90 bg-clay-surface px-6 py-9 shadow-clay">
              <View className="h-[62px] w-[62px] items-center justify-center rounded-[21px] bg-red-50">
                <UserRound size={28} color="#DC2626" strokeWidth={2.3} />
              </View>

              <Text className="mt-4 text-[17px] font-extrabold text-ink-dark">
                Profile unavailable
              </Text>

              <Text className="mt-2 text-center text-[11px] leading-[17px] text-ink-secondary">
                {error ?? "Your dispatcher profile could not be loaded."}
              </Text>

              <Pressable
                disabled={refreshing}
                onPress={refresh}
                className="mt-5 h-[46px] flex-row items-center justify-center rounded-full bg-ocean-400 px-7"
              >
                {refreshing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-[12px] font-extrabold text-white">
                    Retry
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  return (
    <OceanBackground intensity={0.28}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primaryDark}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 130,
          }}
        >
          <Header
            onBack={handleBack}
            editing={editing}
            onEdit={handleStartEditing}
          />

          {/* AVATAR */}

          <View className="mt-5 items-center rounded-[27px] border border-white/90 bg-clay-surface p-6 shadow-clay">
            <Pressable
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
              className="relative h-[100px] w-[100px] items-center justify-center rounded-full bg-ocean-100"
              style={{
                shadowColor: "#38BDF8",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.18,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                />
              ) : (
                <UserRound
                  size={44}
                  color={colors.primaryDark}
                  strokeWidth={2}
                />
              )}

              <View
                className="absolute bottom-0 right-0 h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-white bg-ocean-500"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Camera size={16} color="#FFFFFF" strokeWidth={2.4} />
                )}
              </View>
            </Pressable>

            <Text className="mt-4 text-[17px] font-extrabold text-ink-dark">
              {profile.display_name || "Dispatcher"}
            </Text>

            <Text className="mt-1 text-[11px] text-ink-secondary">
              {profile.email}
            </Text>

            <View className="mt-3 flex-row items-center rounded-full bg-ocean-100 px-3 py-1.5">
              <ListStart
                size={12}
                color={colors.primaryDark}
                strokeWidth={2.4}
              />

              <Text className="ml-1.5 text-[9px] font-extrabold uppercase tracking-[0.6px] text-ocean-700">
                Dispatcher
              </Text>
            </View>
          </View>

          {/* PROFILE DETAILS */}

          <SectionTitle
            icon={
              <UserRound
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Profile Details"
          />

          {editing ? (
            <View className="overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface p-5 shadow-clay">
              <FieldLabel icon={UserRound} label="Display Name" />

              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your name"
                placeholderTextColor={colors.textMuted}
                editable={!saving}
                className="mt-2 h-[46px] rounded-[15px] border border-ocean-100 bg-clay-surfaceSoft px-4 text-[13px] font-semibold text-ink-dark"
              />

              <View className="mt-4">
                <FieldLabel icon={Phone} label="Phone Number" />

                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter your phone number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  editable={!saving}
                  className="mt-2 h-[46px] rounded-[15px] border border-ocean-100 bg-clay-surfaceSoft px-4 text-[13px] font-semibold text-ink-dark"
                />
              </View>

              <View className="mt-4">
                <FieldLabel icon={Mail} label="Email" />

                <View className="mt-2 h-[46px] flex-row items-center rounded-[15px] border border-ocean-100 bg-slate-50 px-4">
                  <Text className="text-[13px] font-semibold text-ink-muted">
                    {profile.email}
                  </Text>
                </View>
              </View>

              <View className="mt-5 flex-row gap-3">
                <Pressable
                  disabled={saving}
                  onPress={handleCancelEdit}
                  className="min-h-[50px] flex-1 items-center justify-center rounded-full border border-ocean-200 bg-white"
                >
                  <Text className="font-extrabold text-ocean-700">Cancel</Text>
                </Pressable>

                <Pressable
                  disabled={saving}
                  onPress={handleSave}
                  className="min-h-[50px] flex-1 items-center justify-center rounded-full bg-ocean-400"
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="font-extrabold text-white">
                      Save Changes
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
              <ProfileRow
                icon={UserRound}
                label="Name"
                value={profile.display_name || "—"}
              />
              <Divider />
              <ProfileRow
                icon={Phone}
                label="Phone"
                value={profile.phone_number ?? "Not provided"}
              />
              <Divider />
              <ProfileRow icon={Mail} label="Email" value={profile.email} />
              <Divider />
              <ProfileRow
                icon={MapPin}
                label="Assigned To"
                value={
                  profile.preferred_terminal != null ||
                  profile.preferred_bracket != null
                    ? [
                        profile.preferred_terminal != null
                          ? `Terminal ${profile.preferred_terminal}`
                          : null,
                        profile.preferred_bracket != null
                          ? `Bracket ${profile.preferred_bracket}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")
                    : "Not yet assigned"
                }
              />
              {profile.created_at && (
                <>
                  <Divider />
                  <ProfileRow
                    icon={Calendar}
                    label="Member Since"
                    value={new Date(profile.created_at).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "long", day: "numeric" },
                    )}
                  />
                </>
              )}
            </View>
          )}

          {/* NOTIFICATIONS */}

          <SectionTitle
            icon={
              pushEnabled ? (
                <Bell size={17} color={colors.primaryDark} strokeWidth={2.3} />
              ) : (
                <BellOff
                  size={17}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />
              )
            }
            title="Notifications"
          />

          <View className="overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
            <SettingsActionRow
              icon={pushEnabled ? Bell : BellOff}
              title="Push Notifications"
              description={
                pushEnabled
                  ? "Receiving Smart Queue alerts on this device"
                  : "Push notifications are currently disabled"
              }
              onPress={handleTogglePush}
              disabled={togglingPush}
              trailing={
                <View
                  className={`rounded-full px-3 py-1.5 ${
                    pushEnabled ? "bg-emerald-50" : "bg-slate-100"
                  }`}
                >
                  <Text
                    className={`text-[9px] font-extrabold uppercase ${
                      pushEnabled ? "text-emerald-700" : "text-slate-500"
                    }`}
                  >
                    {pushEnabled ? "ON" : "OFF"}
                  </Text>
                </View>
              }
            />
          </View>

          {/* ACCOUNT */}

          <SectionTitle
            icon={
              <ListStart
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Account"
          />

          <View className="overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
            <SettingsActionRow
              icon={ListStart}
              title="Security"
              description="Review your account and authentication information"
              onPress={() => {
                showAlert(
                  "Security",
                  "Your Smart Queue dispatcher account is authenticated through Supabase. For password or account security changes, contact the system administrator.",
                );
              }}
            />

            <Divider />

            <SettingsActionRow
              icon={Smartphone}
              title="This Device"
              description={
                pushEnabled
                  ? "This device is registered for push notifications"
                  : "This device is not registered for push notifications"
              }
              onPress={() => {
                showAlert(
                  "This Device",
                  pushEnabled
                    ? "Your current device has an active Smart Queue push notification registration."
                    : "Your current device does not have an active Smart Queue push notification registration.",
                );
              }}
            />
          </View>

          {/* SUPPORT */}

          <SectionTitle
            icon={
              <CircleHelp
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Support"
          />

          <View className="overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
            <SettingsActionRow
              icon={CircleHelp}
              title="Help & Support"
              description="Get assistance with Smart Queue"
              onPress={() => {
                showAlert(
                  "Help & Support",
                  "For assistance with Smart Queue, please contact the terminal administrator or system administrator.",
                );
              }}
            />

            <Divider />

            <SettingsActionRow
              icon={FileText}
              title="Privacy"
              description="Learn how Smart Queue handles account information"
              onPress={() => {
                showAlert(
                  "Privacy",
                  "Smart Queue uses staff account information to provide authentication, monitoring, notifications, and administrative features.",
                );
              }}
            />

            <Divider />

            <SettingsActionRow
              icon={Info}
              title="About Smart Queue"
              description="Application information"
              onPress={() => {
                showAlert(
                  "About Smart Queue",
                  "Smart Queue is a transport terminal monitoring and queue management application developed for capstone and research purposes.",
                );
              }}
            />
          </View>

          {/* SIGN OUT */}

          <Pressable
            disabled={signingOut}
            onPress={handleSignOut}
            className="mt-7 min-h-[56px] flex-row items-center justify-center rounded-full border border-red-200 bg-white shadow-clay-sm"
          >
            {signingOut ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <>
                <LogOut size={18} color="#DC2626" strokeWidth={2.3} />
                <Text className="ml-2 text-[14px] font-extrabold text-red-600">
                  Sign Out
                </Text>
              </>
            )}
          </Pressable>

          {/* FOOTER */}

          <View className="mt-7 items-center">
            <Text className="text-[10px] font-bold uppercase tracking-[1px] text-ink-muted">
              SMART QUEUE
            </Text>
            <Text className="mt-1 text-[9px] text-ink-muted">
              Dispatcher Application
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ClayAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={hideAlert}
      />
    </OceanBackground>
  );
}

/* ================================================================
   HEADER
================================================================ */

function Header({
  onBack,
  editing,
  onEdit,
}: {
  onBack: () => void;
  editing: boolean;
  onEdit: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center">
        <Pressable
          onPress={onBack}
          className="h-[44px] w-[44px] items-center justify-center rounded-[16px] border border-white/90 bg-clay-surface shadow-clay-sm"
        >
          <Text className="text-[24px] font-bold text-ink-dark">‹</Text>
        </Pressable>

        <View className="ml-3">
          <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-ocean-700">
            DISPATCHER
          </Text>
          <Text className="mt-0.5 text-[19px] font-extrabold text-ink-dark">
            My Profile
          </Text>
        </View>
      </View>

      {!editing && (
        <Pressable
          onPress={onEdit}
          className="h-[44px] w-[44px] items-center justify-center rounded-[16px] border border-white/90 bg-clay-surface shadow-clay-sm active:scale-95"
        >
          <Edit3 size={18} color={colors.primaryDark} strokeWidth={2.3} />
        </Pressable>
      )}
    </View>
  );
}

/* ================================================================
   SECTION TITLE
================================================================ */

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View className="mb-2 mt-6 flex-row items-center">
      <View className="h-[31px] w-[31px] items-center justify-center rounded-[11px] bg-ocean-100">
        {icon}
      </View>
      <Text className="ml-2 text-[14px] font-extrabold text-ink-dark">
        {title}
      </Text>
    </View>
  );
}

/* ================================================================
   FIELD LABEL (edit mode)
================================================================ */

function FieldLabel({
  icon: Icon,
  label,
}: {
  icon: typeof UserRound;
  label: string;
}) {
  return (
    <View className="flex-row items-center">
      <Icon size={13} color={colors.textMuted} strokeWidth={2.2} />
      <Text className="ml-1.5 text-[10px] font-extrabold uppercase tracking-[0.6px] text-ink-muted">
        {label}
      </Text>
    </View>
  );
}

/* ================================================================
   PROFILE ROW (read-only view mode)
================================================================ */

function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center px-5 py-4">
      <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
        <Icon size={19} color={colors.primaryDark} strokeWidth={2.2} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[10px] font-bold uppercase tracking-[0.7px] text-ink-muted">
          {label}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-1 text-[13px] font-bold text-ink-dark"
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ================================================================
   SETTINGS ACTION ROW
================================================================ */

function SettingsActionRow({
  icon: Icon,
  title,
  description,
  onPress,
  disabled = false,
  trailing,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center px-5 py-4 active:opacity-80"
    >
      <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
        <Icon size={19} color={colors.primaryDark} strokeWidth={2.2} />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[13px] font-extrabold text-ink-dark">
          {title}
        </Text>
        <Text
          numberOfLines={2}
          className="mt-1 text-[10px] leading-[15px] text-ink-secondary"
        >
          {description}
        </Text>
      </View>

      {disabled ? (
        <ActivityIndicator size="small" color={colors.primaryDark} />
      ) : trailing ? (
        trailing
      ) : (
        <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.2} />
      )}
    </Pressable>
  );
}

/* ================================================================
   DIVIDER
================================================================ */

function Divider() {
  return <View className="mx-5 h-px bg-ocean-100" />;
}

/* ================================================================
   ALERT MODAL
================================================================ */

function ClayAlertModal({
  visible,
  title,
  message,
  buttons,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  onClose: () => void;
}) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="w-full max-w-[360px] rounded-[30px] border border-white/90 bg-clay-surface p-6 shadow-clay-floating">
          <Pressable
            onPress={onClose}
            className="absolute right-4 top-4 h-[32px] w-[32px] items-center justify-center rounded-full bg-ocean-100"
          >
            <X size={16} color={colors.primaryDark} strokeWidth={2.5} />
          </Pressable>

          <Text className="mt-2 pr-8 text-[22px] font-extrabold text-ink-dark">
            {title}
          </Text>

          <Text className="mt-2 text-[13px] leading-[20px] text-ink-secondary">
            {message}
          </Text>

          <View className="mt-6 flex-row flex-wrap gap-3">
            {buttons.map((button, index) => {
              let backgroundClass = "bg-ocean-400";
              let textClass = "text-white";
              let borderClass = "border-ocean-400";

              if (button.style === "cancel") {
                backgroundClass = "bg-white";
                textClass = "text-ocean-700";
                borderClass = "border-ocean-200";
              }

              if (button.style === "destructive") {
                backgroundClass = "bg-red-500";
                textClass = "text-white";
                borderClass = "border-red-500";
              }

              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  onPress={() => {
                    button.onPress();
                    onClose();
                  }}
                  className={`min-h-[48px] min-w-[100px] flex-1 items-center justify-center rounded-full border ${borderClass} ${backgroundClass}`}
                >
                  <Text className={`text-[14px] font-extrabold ${textClass}`}>
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
