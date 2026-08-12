import { supabase } from "@/src/shared/config/supabase";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  Bell,
  BellOff,
  ChevronRight,
  CircleHelp,
  Edit3,
  FileText,
  LogOut,
  ShieldCheck,
  Smartphone,
  User,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "../../../src/shared/components/clay/OceanBackground";
import { colors } from "../../../src/shared/constants/theme";
import {
  getCurrentCommuter,
  signOutCommuter,
  updateCommuterProfile,
  type CommuterProfile,
} from "../../../src/shared/services/CommuterAuthService";

const AVATAR_BUCKET = "avatars";

type ClayAlertConfig = {
  visible: boolean;
  title: string;
  message: string;
  buttons: {
    text: string;
    style?: "default" | "cancel" | "destructive";
    onPress: () => void;
  }[];
};

export default function CommuterProfileScreen() {
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

  const [alertConfig, setAlertConfig] = useState<ClayAlertConfig>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });

  const showClayAlert = (
    title: string,
    message: string,
    buttons: ClayAlertConfig["buttons"] = [{ text: "OK", onPress: () => {} }],
  ) => {
    setAlertConfig({ visible: true, title, message, buttons });
  };

  const hideClayAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

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
      console.log("🖼️ Avatar URL loaded:", commuter.avatar_url);
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

  const uploadAvatar = async (uri: string): Promise<string | null> => {
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

  const pickAvatar = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showClayAlert(
          "Photo access required",
          "Allow photo access to choose a profile picture.",
          [{ text: "OK", onPress: () => {} }],
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const uri = result.assets[0].uri;
      setAvatarUri(uri); // preview

      setUploadingAvatar(true);
      const uploadedUrl = await uploadAvatar(uri);
      if (uploadedUrl) {
        const { error } = await supabase
          .from("users")
          .update({ avatar_url: uploadedUrl })
          .eq("id", profile?.id);
        if (error) {
          console.error("Failed to save avatar URL:", error);
          showClayAlert("Error", "Could not save avatar.", [
            { text: "OK", onPress: () => {} },
          ]);
          setAvatarUri(profile?.avatar_url ?? null);
        } else {
          if (profile) {
            setProfile({ ...profile, avatar_url: uploadedUrl });
          }
          setAvatarUri(uploadedUrl); // ✅ permanent URL
          showClayAlert("Success", "Avatar updated!", [
            { text: "OK", onPress: () => {} },
          ]);
        }
      } else {
        setAvatarUri(profile?.avatar_url ?? null);
      }
    } catch (error) {
      console.error("Failed to select profile image:", error);
      showClayAlert("Unable to select photo", "Please try again.", [
        { text: "OK", onPress: () => {} },
      ]);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const togglePushNotifications = async () => {
    if (togglingPush || !profile) return;

    try {
      setTogglingPush(true);

      if (pushEnabled) {
        const { error } = await supabase
          .from("users")
          .update({ expo_push_token: null })
          .eq("id", profile.id);
        if (error) throw error;
        setPushEnabled(false);
        showClayAlert(
          "Notifications disabled",
          "You won't receive push alerts.",
          [{ text: "OK", onPress: () => {} }],
        );
      } else {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          showClayAlert(
            "Permission denied",
            "Enable notifications in settings to receive alerts.",
            [{ text: "OK", onPress: () => {} }],
          );
          return;
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
          showClayAlert(
            "Error",
            "App configuration missing. Please contact support.",
            [{ text: "OK", onPress: () => {} }],
          );
          return;
        }

        const token = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!token.data) {
          showClayAlert("Error", "Could not get push token.", [
            { text: "OK", onPress: () => {} },
          ]);
          return;
        }

        const { error } = await supabase
          .from("users")
          .update({ expo_push_token: token.data })
          .eq("id", profile.id);
        if (error) throw error;

        setPushEnabled(true);
        showClayAlert(
          "Notifications enabled",
          "You'll now receive push alerts.",
          [{ text: "OK", onPress: () => {} }],
        );
      }
    } catch (error) {
      console.error("Toggle push error:", error);
      showClayAlert("Error", "Could not update notification settings.", [
        { text: "OK", onPress: () => {} },
      ]);
    } finally {
      setTogglingPush(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    try {
      setRefreshing(true);
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  };

  const handleStartEditing = () => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setMobile(profile.phone_number ?? "");
    setEditing(true);
  };

  const handleCancelEdit = () => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setMobile(profile.phone_number ?? "");
    setEditing(false);
  };

  const handleSave = async () => {
    if (saving || !profile) return;
    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();
    if (!trimmedName) {
      showClayAlert("Name required", "Please enter your name.", [
        { text: "OK", onPress: () => {} },
      ]);
      return;
    }
    if (!trimmedMobile) {
      showClayAlert(
        "Mobile number required",
        "Please enter your mobile number.",
        [{ text: "OK", onPress: () => {} }],
      );
      return;
    }
    try {
      setSaving(true);
      const result = await updateCommuterProfile({
        name: trimmedName,
        mobile: trimmedMobile,
      });
      if (!result.success || !result.user) {
        showClayAlert(
          "Unable to save",
          result.error || "We couldn't update your profile.",
          [{ text: "OK", onPress: () => {} }],
        );
        return;
      }
      setProfile(result.user);
      setName(result.user.display_name ?? "");
      setMobile(result.user.phone_number ?? "");
      setEditing(false);
      showClayAlert("Profile updated", "Your profile has been saved.", [
        { text: "OK", onPress: () => {} },
      ]);
    } catch (error) {
      console.error("Failed to update commuter profile:", error);
      showClayAlert(
        "Something went wrong",
        "We couldn't update your profile.",
        [{ text: "OK", onPress: () => {} }],
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    showClayAlert(
      "Sign out",
      "Are you sure you want to sign out of Smart Queue?",
      [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            const success = await signOutCommuter();
            if (!success) {
              showClayAlert("Unable to sign out", "Please try again.", [
                { text: "OK", onPress: () => {} },
              ]);
              return;
            }
            router.replace("/commuter/onboarding/name");
          },
        },
      ],
    );
  };

  const initials = useMemo(() => {
    const value = profile?.display_name?.trim() || name.trim();
    if (!value) return "SQ";
    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [profile?.display_name, name]);

  if (loading) {
    return (
      <OceanBackground intensity={0.35}>
        <SafeAreaView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primaryDark} />
          <Text className="mt-4 text-[13px] font-semibold text-ink-secondary">
            Loading your profile...
          </Text>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  if (!profile) {
    return (
      <OceanBackground intensity={0.35}>
        <SafeAreaView className="flex-1">
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
              paddingVertical: 40,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View className="h-[82px] w-[82px] items-center justify-center rounded-[28px] border border-white/90 bg-clay-surface shadow-clay">
              <User size={36} color={colors.primaryDark} strokeWidth={2} />
            </View>
            <Text className="mt-6 text-center text-[24px] font-extrabold text-ink-dark">
              Profile unavailable
            </Text>
            <Text className="mt-2 max-w-[320px] text-center text-[13px] leading-[20px] text-ink-secondary">
              We couldn't find your commuter profile. Try loading it again.
            </Text>
            <Pressable
              disabled={refreshing}
              onPress={handleRefresh}
              className="mt-6 min-h-[52px] min-w-[150px] items-center justify-center rounded-full bg-ocean-400 px-7"
            >
              {refreshing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="font-extrabold text-white">Try Again</Text>
              )}
            </Pressable>
            <Pressable
              onPress={handleSignOut}
              className="mt-3 min-h-[48px] items-center justify-center rounded-full px-6"
            >
              <Text className="font-bold text-ocean-700">Sign Out</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  return (
    <OceanBackground intensity={0.35}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 40,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-ocean-700">
                SMART QUEUE
              </Text>
              <Text className="mt-1 text-[28px] font-extrabold text-ink-dark">
                My Profile
              </Text>
            </View>
            {!editing && (
              <Pressable
                onPress={handleStartEditing}
                className="h-[46px] w-[46px] items-center justify-center rounded-full border border-white/90 bg-clay-surface shadow-clay-sm active:scale-95"
              >
                <Edit3 size={19} color={colors.primaryDark} strokeWidth={2.3} />
              </Pressable>
            )}
          </View>

          <View className="mt-7 items-center">
            <Pressable
              onPress={pickAvatar}
              disabled={uploadingAvatar}
              className="relative h-[112px] w-[112px] items-center justify-center rounded-full border-4 border-white bg-ocean-100 shadow-clay"
            >
              {avatarUri ? (
                <Image
                  source={{
                    uri: `${avatarUri}?t=${Date.now()}`,
                    cache: "reload",
                  }}
                  className="h-full w-full rounded-full"
                  resizeMode="cover"
                  onError={(e) => {
                    console.error(
                      "❌ Image failed to load:",
                      avatarUri,
                      e.nativeEvent.error,
                    );
                    setAvatarUri(null);
                  }}
                  onLoad={() =>
                    console.log("✅ Image loaded successfully:", avatarUri)
                  }
                />
              ) : (
                <Text className="text-[32px] font-extrabold text-ocean-700">
                  {initials}
                </Text>
              )}
              {uploadingAvatar && (
                <View className="absolute inset-0 items-center justify-center rounded-full bg-black/30">
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
              <View className="absolute bottom-0 right-0 h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-white bg-ocean-400">
                <Edit3 size={15} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </Pressable>
            <Text className="mt-4 text-center text-[22px] font-extrabold text-ink-dark">
              {profile.display_name}
            </Text>
            <View className="mt-2 flex-row items-center rounded-full bg-green-100 px-3 py-1.5">
              <View className="mr-2 h-[7px] w-[7px] rounded-full bg-green-500" />
              <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-green-700">
                Active commuter
              </Text>
            </View>
          </View>

          {editing ? (
            <View className="mt-8 rounded-[26px] border border-white/90 bg-clay-surface p-5 shadow-clay">
              <View className="flex-row items-center">
                <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
                  <User
                    size={19}
                    color={colors.primaryDark}
                    strokeWidth={2.2}
                  />
                </View>
                <View className="ml-3">
                  <Text className="text-[14px] font-extrabold text-ink-dark">
                    Personal Information
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-ink-secondary">
                    Update your commuter details
                  </Text>
                </View>
              </View>
              <Text className="mt-6 text-[11px] font-bold uppercase tracking-[0.8px] text-ocean-700">
                Full Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                editable={!saving}
                className="mt-2 min-h-[52px] rounded-[17px] border border-ocean-100 bg-white px-4 text-[14px] font-semibold text-ink-dark"
              />
              <Text className="mt-4 text-[11px] font-bold uppercase tracking-[0.8px] text-ocean-700">
                Mobile Number
              </Text>
              <TextInput
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                placeholder="Your mobile number"
                placeholderTextColor={colors.textMuted}
                editable={!saving}
                className="mt-2 min-h-[52px] rounded-[17px] border border-ocean-100 bg-white px-4 text-[14px] font-semibold text-ink-dark"
              />
              <View className="mt-5 flex-row gap-3">
                <Pressable
                  disabled={saving}
                  onPress={handleCancelEdit}
                  className="min-h-[52px] flex-1 items-center justify-center rounded-full border border-ocean-200 bg-white"
                >
                  <Text className="font-extrabold text-ocean-700">Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={saving}
                  onPress={handleSave}
                  className="min-h-[52px] flex-1 items-center justify-center rounded-full bg-ocean-400"
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
            <>
              <View className="mt-8">
                <Text className="mb-3 text-[11px] font-bold uppercase tracking-[1.2px] text-ocean-700">
                  Personal Information
                </Text>
                <View className="overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
                  <ProfileRow
                    icon={User}
                    label="Name"
                    value={profile.display_name}
                  />
                  <View className="mx-5 h-px bg-ocean-100" />
                  <ProfileRow
                    icon={Smartphone}
                    label="Mobile"
                    value={profile.phone_number ?? "Not provided"}
                  />
                </View>
              </View>

              <View className="mt-7">
                <Text className="mb-3 text-[11px] font-bold uppercase tracking-[1.2px] text-ocean-700">
                  Preferences
                </Text>
                <View className="overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
                  <ProfileActionRow
                    icon={pushEnabled ? Bell : BellOff}
                    title="Push Notifications"
                    description={
                      pushEnabled
                        ? "You'll receive alerts on your device"
                        : "Notifications are currently off"
                    }
                    onPress={togglePushNotifications}
                    disabled={togglingPush}
                  />
                </View>
              </View>

              <View className="mt-7">
                <Text className="mb-3 text-[11px] font-bold uppercase tracking-[1.2px] text-ocean-700">
                  Support
                </Text>
                <View className="overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
                  <ProfileActionRow
                    icon={CircleHelp}
                    title="Help & Support"
                    description="Get assistance with Smart Queue"
                    onPress={() => {
                      showClayAlert(
                        "Help & Support",
                        "For assistance with Smart Queue, please contact the terminal administrator.",
                        [{ text: "OK", onPress: () => {} }],
                      );
                    }}
                  />
                  <View className="mx-5 h-px bg-ocean-100" />
                  <ProfileActionRow
                    icon={FileText}
                    title="About Smart Queue"
                    description="Information about the application"
                    onPress={() => {
                      showClayAlert(
                        "About Smart Queue",
                        "Smart Queue helps commuters monitor jeepney queues, arrivals, dispatch updates, and notifications.",
                        [{ text: "OK", onPress: () => {} }],
                      );
                    }}
                  />
                  <View className="mx-5 h-px bg-ocean-100" />
                  <ProfileActionRow
                    icon={ShieldCheck}
                    title="Privacy"
                    description="How your information is handled"
                    onPress={() => {
                      showClayAlert(
                        "Privacy",
                        "Your commuter information is used to provide Smart Queue services and notifications.",
                        [{ text: "OK", onPress: () => {} }],
                      );
                    }}
                  />
                </View>
              </View>

              <Pressable
                onPress={handleSignOut}
                className="mt-8 min-h-[56px] flex-row items-center justify-center rounded-full border border-red-200 bg-white active:opacity-80"
              >
                <LogOut size={18} color="#DC2626" strokeWidth={2.3} />
                <Text className="ml-2 text-[14px] font-extrabold text-red-600">
                  Sign Out
                </Text>
              </Pressable>
              <Text className="mt-5 text-center text-[10px] text-ink-muted">
                Smart Queue
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <ClayModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={hideClayAlert}
      />
    </OceanBackground>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
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

function ProfileActionRow({
  icon: Icon,
  title,
  description,
  onPress,
  disabled = false,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
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
          numberOfLines={1}
          className="mt-1 text-[10px] leading-[15px] text-ink-secondary"
        >
          {description}
        </Text>
      </View>
      {disabled ? (
        <ActivityIndicator size="small" color={colors.primaryDark} />
      ) : (
        <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.2} />
      )}
    </Pressable>
  );
}

function ClayModal({
  visible,
  title,
  message,
  buttons,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  buttons: {
    text: string;
    style?: "default" | "cancel" | "destructive";
    onPress: () => void;
  }[];
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

          <Text className="mt-2 text-[22px] font-extrabold text-ink-dark">
            {title}
          </Text>

          <Text className="mt-2 text-[13px] leading-[20px] text-ink-secondary">
            {message}
          </Text>

          <View className="mt-6 flex-row flex-wrap gap-3">
            {buttons.map((btn, idx) => {
              let bgColor = "bg-ocean-400";
              let textColor = "text-white";
              let borderColor = "border-ocean-400";

              if (btn.style === "cancel") {
                bgColor = "bg-white";
                textColor = "text-ocean-700";
                borderColor = "border-ocean-200";
              } else if (btn.style === "destructive") {
                bgColor = "bg-red-500";
                textColor = "text-white";
                borderColor = "border-red-500";
              }

              return (
                <Pressable
                  key={idx}
                  onPress={() => {
                    btn.onPress();
                    onClose();
                  }}
                  className={`flex-1 min-w-[100px] min-h-[48px] items-center justify-center rounded-full border ${borderColor} ${bgColor}`}
                >
                  <Text className={`text-[14px] font-extrabold ${textColor}`}>
                    {btn.text}
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
