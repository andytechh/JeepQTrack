import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Edit3,
  FileText,
  LogOut,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
  User,
  UserRound,
  Users,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "@/src/shared/components/clay/OceanBackground";
import { supabase } from "@/src/shared/config/supabase";
import { colors } from "@/src/shared/constants/theme";
import {
  AdminProfile,
  useAdminProfile,
} from "@/src/shared/hooks/admin/useAdminProfile";

const AVATAR_BUCKET = "avatars";

/* ================================================================
   TYPES
================================================================ */

type ClayAlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress: () => void;
};

type ClayAlertConfig = {
  visible: boolean;
  title: string;
  message: string;
  buttons: ClayAlertButton[];
};

/* ================================================================
   HELPERS
================================================================ */

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "Not available";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString();
}

/**
 * Normalize Philippine mobile numbers into the SMS-compatible format:
 *
 * +639XXXXXXXXX
 *
 * Supported input examples:
 * 09171234567
 * 639171234567
 * +639171234567
 *
 * Final stored format:
 * +639171234567
 */
function normalizePhilippineMobile(value: string) {
  let cleaned = value.replace(/[^\d+]/g, "");

  // If the user enters the normal Philippine local format:
  // 09XXXXXXXXX
  if (cleaned.startsWith("09")) {
    cleaned = `+63${cleaned.slice(1)}`;
  }

  // If the user enters:
  // 639XXXXXXXXX
  if (cleaned.startsWith("639")) {
    cleaned = `+${cleaned}`;
  }

  // If it starts with +63, keep it.
  if (cleaned.startsWith("+63")) {
    const subscriberNumber = cleaned.slice(3).replace(/\D/g, "").slice(0, 10);

    return `+63${subscriberNumber}`;
  }

  // If the user manually types only a digit sequence,
  // interpret it as a Philippine number.
  if (cleaned && !cleaned.startsWith("+")) {
    cleaned = cleaned.replace(/\D/g, "");

    // Local format beginning with 9:
    // 9171234567 -> +639171234567
    if (cleaned.startsWith("9")) {
      return `+63${cleaned.slice(0, 10)}`;
    }

    // Local format beginning with 0:
    // 09171234567 -> +639171234567
    if (cleaned.startsWith("0")) {
      return `+63${cleaned.slice(1, 11)}`;
    }

    return `+63${cleaned.slice(0, 10)}`;
  }

  // If "+" exists but the country code is wrong,
  // constrain it back to +63.
  if (cleaned.startsWith("+")) {
    const digits = cleaned.replace(/\D/g, "");

    if (digits.startsWith("63")) {
      return `+63${digits.slice(2, 12)}`;
    }

    return "+63";
  }

  return cleaned;
}

function isValidPhilippineMobile(value: string) {
  return /^\+639\d{9}$/.test(value);
}

function getRolePresentation(role: AdminProfile["role"]) {
  switch (role) {
    case "admin":
      return {
        label: "Administrator",
        background: "#E0F2FE",
        color: "#0369A1",
        icon: ShieldCheck,
      };

    case "dispatcher":
      return {
        label: "Dispatcher",
        background: "#FEF3C7",
        color: "#B45309",
        icon: BriefcaseBusiness,
      };

    case "driver":
      return {
        label: "Driver",
        background: "#E0E7FF",
        color: "#4338CA",
        icon: UserRound,
      };

    default:
      return {
        label: "Staff",
        background: "#F1F5F9",
        color: "#64748B",
        icon: UserRound,
      };
  }
}

/* ================================================================
   MAIN SCREEN
================================================================ */

export default function AdminProfileScreen() {
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
  } = useAdminProfile();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(!!profile?.expo_push_token);
  const [togglingPush, setTogglingPush] = useState(false);

  const [alertConfig, setAlertConfig] = useState<ClayAlertConfig>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });

  const rolePresentation = useMemo(
    () => getRolePresentation(profile?.role ?? "admin"),
    [profile?.role],
  );

  const RoleIcon = rolePresentation.icon;

  /* ================================================================
     ALERT
  ================================================================ */

  const showClayAlert = (
    title: string,
    message: string,
    buttons: ClayAlertButton[] = [
      {
        text: "OK",
        onPress: () => {},
      },
    ],
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons,
    });
  };

  const hideClayAlert = () => {
    setAlertConfig((prev) => ({
      ...prev,
      visible: false,
    }));
  };

  /* ================================================================
     NAVIGATION
  ================================================================ */

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/staff/(admin)/(tabs)");
  };

  /* ================================================================
     EDIT PROFILE
  ================================================================ */

  const startEditing = () => {
    if (!profile) return;

    setName(profile.display_name ?? "");

    setMobile(normalizePhilippineMobile(profile.phone_number ?? ""));

    setEditing(true);
  };

  const cancelEditing = () => {
    if (!profile) return;

    Keyboard.dismiss();

    setName(profile.display_name ?? "");

    setMobile(normalizePhilippineMobile(profile.phone_number ?? ""));

    setEditing(false);
  };

  const saveProfile = async () => {
    if (!profile || saving) return;

    Keyboard.dismiss();

    const trimmedName = name.trim();
    const normalizedMobile = normalizePhilippineMobile(mobile);

    /* --------------------------------------------------------------
       NAME VALIDATION
    -------------------------------------------------------------- */

    if (!trimmedName) {
      showClayAlert("Name required", "Please enter your full name.");
      return;
    }

    if (trimmedName.length < 2) {
      showClayAlert("Invalid name", "Please enter a valid full name.");
      return;
    }

    /* --------------------------------------------------------------
       MOBILE VALIDATION
    -------------------------------------------------------------- */

    if (!normalizedMobile) {
      showClayAlert(
        "Mobile number required",
        "Please enter your mobile number using the +63 format.",
      );
      return;
    }

    if (!isValidPhilippineMobile(normalizedMobile)) {
      showClayAlert(
        "Invalid mobile number",
        "Please enter a valid Philippine mobile number using this format: +639XXXXXXXXX.",
      );
      return;
    }

    // Keep state synchronized with the normalized value.
    setMobile(normalizedMobile);

    /* --------------------------------------------------------------
       UPDATE DATABASE
    -------------------------------------------------------------- */

    const result = await updateProfile({
      display_name: trimmedName,
      phone_number: normalizedMobile,
    });

    if (!result.success) {
      showClayAlert(
        "Unable to save",
        result.error ?? "Your profile could not be updated.",
      );
      return;
    }

    setEditing(false);

    showClayAlert(
      "Profile updated",
      "Your profile information has been saved.",
    );
  };

  /* ================================================================
     AVATAR
  ================================================================ */

  const uploadAvatar = async (uri: string) => {
    if (!profile) return null;

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const extension =
        uri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";

      const fileName = `${Date.now()}.${extension}`;
      const filePath = `${profile.id}/${fileName}`;

      const contentType =
        extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : "image/jpeg";

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, blob, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error("Avatar upload error:", err);
      return null;
    }
  };

  const pickAvatar = async () => {
    if (!profile || uploadingAvatar) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showClayAlert(
          "Photo access required",
          "Allow photo access to choose a profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const uri = result.assets[0].uri;

      setUploadingAvatar(true);

      const uploadedUrl = await uploadAvatar(uri);

      if (!uploadedUrl) {
        showClayAlert(
          "Upload failed",
          "Your profile picture could not be uploaded.",
        );
        return;
      }

      const response = await updateAvatar(uploadedUrl);

      if (!response.success) {
        showClayAlert(
          "Unable to save",
          response.error ?? "Your profile picture could not be saved.",
        );
        return;
      }

      showClayAlert(
        "Profile picture updated",
        "Your new profile picture has been saved.",
      );
    } catch (err) {
      console.error("Failed to select avatar:", err);

      showClayAlert("Unable to select photo", "Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  /* ================================================================
     PUSH NOTIFICATIONS
  ================================================================ */

  const togglePushNotifications = async () => {
    if (!profile || togglingPush) return;

    try {
      setTogglingPush(true);

      if (pushEnabled) {
        const result = await updatePushToken(null);

        if (!result.success) {
          throw new Error(result.error ?? "Unable to disable notifications.");
        }

        setPushEnabled(false);

        showClayAlert(
          "Notifications disabled",
          "You will no longer receive push notifications on this device.",
        );

        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();

      if (status !== "granted") {
        showClayAlert(
          "Permission denied",
          "Enable notifications in your device settings to receive admin alerts.",
        );
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        showClayAlert(
          "Configuration error",
          "The Expo project ID is missing from the application configuration.",
        );
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      if (!token.data) {
        showClayAlert(
          "Token unavailable",
          "The device notification token could not be generated.",
        );
        return;
      }

      const result = await updatePushToken(token.data);

      if (!result.success) {
        throw new Error(result.error ?? "Unable to enable notifications.");
      }

      setPushEnabled(true);

      showClayAlert(
        "Notifications enabled",
        "You will now receive admin push notifications.",
      );
    } catch (err) {
      console.error("Notification toggle error:", err);

      showClayAlert("Unable to update notifications", "Please try again.");
    } finally {
      setTogglingPush(false);
    }
  };

  /* ================================================================
     SIGN OUT
  ================================================================ */

  const handleSignOut = () => {
    showClayAlert(
      "Sign out",
      "Are you sure you want to sign out of Smart Queue?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {},
        },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            const { error: signOutError } = await supabase.auth.signOut();

            if (signOutError) {
              showClayAlert("Unable to sign out", signOutError.message);
              return;
            }

            router.replace("/staff/login");
          },
        },
      ],
    );
  };

  /* ================================================================
     INITIALS
  ================================================================ */

  const initials = useMemo(() => {
    const value = profile?.display_name?.trim() || name.trim();

    if (!value) {
      return "SQ";
    }

    const parts = value.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [profile?.display_name, name]);

  /* ================================================================
     LOADING
  ================================================================ */

  if (loading) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1 items-center justify-center">
          <View className="h-[76px] w-[76px] items-center justify-center rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
            <ActivityIndicator size="small" color={colors.primaryDark} />
          </View>

          <Text className="mt-4 text-[14px] font-extrabold text-ink-dark">
            Loading profile...
          </Text>

          <Text className="mt-1 text-[11px] text-ink-secondary">
            Getting your staff account information
          </Text>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  /* ================================================================
     PROFILE UNAVAILABLE
  ================================================================ */

  if (!profile) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 px-5 pt-4">
            <Header onBack={handleBack} />

            <View className="mt-8 items-center rounded-[28px] border border-white/90 bg-clay-surface px-6 py-9 shadow-clay">
              <View className="h-[64px] w-[64px] items-center justify-center rounded-[21px] bg-red-50">
                <AlertTriangle size={29} color="#DC2626" strokeWidth={2.3} />
              </View>

              <Text className="mt-4 text-[18px] font-extrabold text-ink-dark">
                Profile unavailable
              </Text>

              <Text className="mt-2 text-center text-[11px] leading-[17px] text-ink-secondary">
                {error ?? "Your staff profile could not be loaded."}
              </Text>

              <Pressable
                disabled={refreshing}
                onPress={refresh}
                className="mt-5 h-[48px] flex-row items-center justify-center rounded-full bg-ocean-400 px-7"
              >
                {refreshing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-[12px] font-extrabold text-white">
                    Try Again
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  /* ================================================================
     MAIN PROFILE
  ================================================================ */

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
            paddingBottom: 140,
          }}
        >
          <Header onBack={handleBack} />

          {/* ======================================================
             PROFILE HERO
          ====================================================== */}

          <View className="mt-5 rounded-[28px] border border-white/90 bg-clay-surface p-5 shadow-clay">
            <View className="items-center">
              <Pressable
                onPress={pickAvatar}
                disabled={uploadingAvatar}
                className="relative h-[112px] w-[112px] items-center justify-center rounded-full border-4 border-white bg-ocean-100 shadow-clay"
              >
                {profile.avatar_url ? (
                  <Image
                    source={{
                      uri: profile.avatar_url,
                    }}
                    className="h-full w-full rounded-full"
                    resizeMode="cover"
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

                <View className="absolute bottom-0 right-0 h-[35px] w-[35px] items-center justify-center rounded-full border-2 border-white bg-ocean-400">
                  <Edit3 size={15} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </Pressable>

              <Text
                numberOfLines={1}
                className="mt-4 max-w-[290px] text-center text-[22px] font-extrabold text-ink-dark"
              >
                {profile.display_name || "Admin User"}
              </Text>

              <Text
                numberOfLines={1}
                className="mt-1 max-w-[300px] text-center text-[11px] font-semibold text-ink-secondary"
              >
                {profile.email || "No email address"}
              </Text>

              <View
                className="mt-3 flex-row items-center rounded-full px-4 py-2"
                style={{
                  backgroundColor: rolePresentation.background,
                }}
              >
                <RoleIcon
                  size={14}
                  color={rolePresentation.color}
                  strokeWidth={2.4}
                />

                <Text
                  className="ml-2 text-[10px] font-extrabold uppercase"
                  style={{
                    color: rolePresentation.color,
                  }}
                >
                  {rolePresentation.label}
                </Text>
              </View>
            </View>

            <View className="mt-5 flex-row items-center justify-center rounded-[18px] bg-emerald-50 px-4 py-3">
              <CheckCircle2 size={16} color="#059669" strokeWidth={2.4} />

              <Text className="ml-2 text-[10px] font-extrabold text-emerald-700">
                Account Active
              </Text>
            </View>
          </View>

          {/* ======================================================
             EDIT PROFILE BUTTON
          ====================================================== */}

          <Pressable
            onPress={startEditing}
            className="mt-5 flex-row items-center rounded-[23px] border border-white/90 bg-clay-surface p-4 shadow-clay-sm"
          >
            <View className="h-[44px] w-[44px] items-center justify-center rounded-[15px] bg-ocean-100">
              <Edit3 size={20} color={colors.primaryDark} strokeWidth={2.3} />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[13px] font-extrabold text-ink-dark">
                Edit Profile
              </Text>

              <Text className="mt-0.5 text-[10px] text-ink-secondary">
                Update your personal information
              </Text>
            </View>

            <ChevronRight size={19} color={colors.textMuted} />
          </Pressable>

          {/* ======================================================
             CONTACT
          ====================================================== */}

          <SectionTitle
            icon={
              <Smartphone
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Contact Information"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5 shadow-clay">
            <DetailRow
              icon={<User size={17} color="#64748B" strokeWidth={2.2} />}
              label="Name"
              value={profile.display_name || "Not available"}
            />

            <Divider />

            <DetailRow
              icon={<Smartphone size={17} color="#64748B" strokeWidth={2.2} />}
              label="Mobile"
              value={profile.phone_number || "Not provided"}
            />

            <Divider />

            <DetailRow
              icon={<Phone size={17} color="#64748B" strokeWidth={2.2} />}
              label="Email"
              value={profile.email || "Not available"}
            />
          </View>

          {/* ======================================================
             STAFF
          ====================================================== */}

          <SectionTitle
            icon={
              <ShieldCheck
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Staff Information"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5 shadow-clay">
            <DetailRow
              icon={<ShieldCheck size={17} color="#64748B" strokeWidth={2.2} />}
              label="Role"
              value={rolePresentation.label}
            />

            <Divider />

            <DetailRow
              icon={<MapPin size={17} color="#64748B" strokeWidth={2.2} />}
              label="Preferred terminal"
              value={
                profile.preferred_terminal !== null
                  ? `Terminal ${profile.preferred_terminal}`
                  : "Not assigned"
              }
            />

            <Divider />

            <DetailRow
              icon={<Users size={17} color="#64748B" strokeWidth={2.2} />}
              label="Preferred bracket"
              value={
                profile.preferred_bracket !== null
                  ? `Bracket ${profile.preferred_bracket}`
                  : "Not assigned"
              }
            />
          </View>

          {/* ======================================================
             NOTIFICATIONS
          ====================================================== */}

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
            title="Preferences"
          />

          <View className="overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
            <ProfileActionRow
              icon={pushEnabled ? Bell : BellOff}
              title="Push Notifications"
              description={
                pushEnabled
                  ? "Admin push notifications are enabled"
                  : "Admin push notifications are disabled"
              }
              onPress={togglePushNotifications}
              disabled={togglingPush}
            />
          </View>

          {/* ======================================================
             ACCOUNT
          ====================================================== */}

          <SectionTitle
            icon={
              <CalendarClock
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Account Information"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5 shadow-clay">
            <DetailRow
              icon={<UserRound size={17} color="#64748B" strokeWidth={2.2} />}
              label="Account ID"
              value={profile.id}
            />

            <Divider />

            <DetailRow
              icon={
                <CalendarClock size={17} color="#64748B" strokeWidth={2.2} />
              }
              label="Created"
              value={formatDate(profile.created_at)}
            />

            <Divider />

            <DetailRow
              icon={
                <CalendarClock size={17} color="#64748B" strokeWidth={2.2} />
              }
              label="Last updated"
              value={formatDate(profile.updated_at)}
            />
          </View>

          {/* ======================================================
             SUPPORT
          ====================================================== */}

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
            <ProfileActionRow
              icon={CircleHelp}
              title="Help & Support"
              description="Get assistance with Smart Queue"
              onPress={() =>
                showClayAlert(
                  "Help & Support",
                  "For assistance with Smart Queue, please contact the system administrator.",
                )
              }
            />

            <Divider />

            <ProfileActionRow
              icon={FileText}
              title="About Smart Queue"
              description="Information about the application"
              onPress={() =>
                showClayAlert(
                  "About Smart Queue",
                  "Smart Queue is a transport queue monitoring system developed for capstone and research purposes.",
                )
              }
            />

            <Divider />

            <ProfileActionRow
              icon={ShieldCheck}
              title="Privacy"
              description="How your information is handled"
              onPress={() =>
                showClayAlert(
                  "Privacy",
                  "Your staff account information is used to provide Smart Queue administrative and transport-management services.",
                )
              }
            />
          </View>

          {/* ======================================================
             SIGN OUT
          ====================================================== */}

          <Pressable
            onPress={handleSignOut}
            className="mt-8 min-h-[56px] flex-row items-center justify-center rounded-full border border-red-200 bg-white"
          >
            <LogOut size={18} color="#DC2626" strokeWidth={2.3} />

            <Text className="ml-2 text-[14px] font-extrabold text-red-600">
              Sign Out
            </Text>
          </Pressable>

          <Text className="mt-5 text-center text-[10px] text-ink-muted">
            Smart Queue • Admin
          </Text>

          {/* ======================================================
             ERROR
          ====================================================== */}

          {error && (
            <View className="mt-5 rounded-[22px] border border-red-100 bg-white/90 p-4">
              <View className="flex-row items-center">
                <AlertTriangle size={18} color="#DC2626" strokeWidth={2.3} />

                <Text className="ml-2 flex-1 text-[10px] font-semibold text-red-700">
                  {error}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ============================================================
         PERSONAL INFORMATION MODAL
      ============================================================ */}

      <PersonalInformationModal
        visible={editing}
        name={name}
        mobile={mobile}
        saving={saving}
        onNameChange={setName}
        onMobileChange={(value) => {
          setMobile(normalizePhilippineMobile(value));
        }}
        onSave={saveProfile}
        onCancel={cancelEditing}
      />

      {/* ============================================================
         CLAY ALERT
      ============================================================ */}

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

/* ================================================================
   PERSONAL INFORMATION MODAL
================================================================ */

function PersonalInformationModal({
  visible,
  name,
  mobile,
  saving,
  onNameChange,
  onMobileChange,
  onSave,
  onCancel,
}: {
  visible: boolean;
  name: string;
  mobile: string;
  saving: boolean;
  onNameChange: (value: string) => void;
  onMobileChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const mobileValid = isValidPhilippineMobile(mobile);

  const nameValid = name.trim().length >= 2;

  const canSave = !saving && nameValid && mobileValid;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/40">
        <KeyboardAwareScrollView
          enableOnAndroid
          enableAutomaticScroll
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          extraScrollHeight={18}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingVertical: 24,
          }}
        >
          <View className="w-full rounded-[30px] border border-white/90 bg-clay-surface p-6 shadow-clay-floating">
            {/* CLOSE BUTTON */}

            <Pressable
              onPress={onCancel}
              disabled={saving}
              className="absolute right-4 top-4 h-[34px] w-[34px] items-center justify-center rounded-full bg-ocean-100"
            >
              <X size={17} color={colors.primaryDark} strokeWidth={2.5} />
            </Pressable>

            {/* HEADER */}

            <View className="pr-10">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1px] text-ocean-700">
                ADMIN PROFILE
              </Text>

              <Text className="mt-1 text-[22px] font-extrabold text-ink-dark">
                Personal Information
              </Text>

              <Text className="mt-1 text-[11px] leading-[17px] text-ink-secondary">
                Update your name and mobile number.
              </Text>
            </View>

            {/* NAME */}

            <View className="mt-6">
              <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-ocean-700">
                Full Name
              </Text>

              <TextInput
                value={name}
                onChangeText={onNameChange}
                autoCapitalize="words"
                autoCorrect={false}
                placeholder="Your full name"
                placeholderTextColor={colors.textMuted}
                editable={!saving}
                returnKeyType="next"
                className={`mt-2 min-h-[52px] rounded-[17px] border bg-white px-4 text-[14px] font-semibold text-ink-dark ${
                  name.length > 0 && !nameValid
                    ? "border-red-300"
                    : "border-ocean-100"
                }`}
              />

              {name.length > 0 && !nameValid && (
                <View className="mt-2 flex-row items-center">
                  <AlertTriangle size={13} color="#DC2626" strokeWidth={2.4} />

                  <Text className="ml-1.5 text-[10px] font-semibold text-red-600">
                    Please enter a valid name.
                  </Text>
                </View>
              )}
            </View>

            {/* MOBILE */}

            <View className="mt-5">
              <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-ocean-700">
                Mobile Number
              </Text>

              <TextInput
                value={mobile}
                onChangeText={onMobileChange}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                autoCorrect={false}
                placeholder="+639171234567"
                placeholderTextColor={colors.textMuted}
                editable={!saving}
                maxLength={13}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (canSave) {
                    onSave();
                  }
                }}
                className={`mt-2 min-h-[52px] rounded-[17px] border bg-white px-4 text-[14px] font-semibold text-ink-dark ${
                  mobile.length > 0 && !mobileValid
                    ? "border-red-300"
                    : "border-ocean-100"
                }`}
              />

              <Text className="mt-2 text-[10px] leading-[15px] text-ink-muted">
                Philippine mobile format: +639XXXXXXXXX
              </Text>

              {mobile.length > 0 && !mobileValid && (
                <View className="mt-2 flex-row items-center">
                  <AlertTriangle size={13} color="#DC2626" strokeWidth={2.4} />

                  <Text className="ml-1.5 flex-1 text-[10px] font-semibold text-red-600">
                    Enter a valid +63 mobile number.
                  </Text>
                </View>
              )}
            </View>

            {/* SMS FORMAT INFO */}

            <View className="mt-5 flex-row items-center rounded-[17px] bg-ocean-50 px-4 py-3">
              <Smartphone
                size={16}
                color={colors.primaryDark}
                strokeWidth={2.2}
              />

              <Text className="ml-2 flex-1 text-[10px] leading-[15px] font-semibold text-ocean-800">
                This number will be used for staff SMS notifications and must
                use the +63 format.
              </Text>
            </View>

            {/* ACTIONS */}

            <View className="mt-6 flex-row gap-3">
              <Pressable
                disabled={saving}
                onPress={onCancel}
                className="min-h-[52px] flex-1 items-center justify-center rounded-full border border-ocean-200 bg-white"
              >
                <Text className="font-extrabold text-ocean-700">Cancel</Text>
              </Pressable>

              <Pressable
                disabled={!canSave}
                onPress={onSave}
                className={`min-h-[52px] flex-1 items-center justify-center rounded-full ${
                  canSave ? "bg-ocean-400" : "bg-ocean-200"
                }`}
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
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
}

/* ================================================================
   HEADER
================================================================ */

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={onBack}
        className="h-[44px] w-[44px] items-center justify-center rounded-[16px] border border-white/90 bg-clay-surface shadow-clay-sm"
      >
        <ArrowLeft size={20} color="#334155" strokeWidth={2.4} />
      </Pressable>

      <View className="ml-3 flex-1">
        <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-ocean-700">
          ADMIN
        </Text>

        <Text className="mt-0.5 text-[19px] font-extrabold text-ink-dark">
          My Profile
        </Text>
      </View>
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
   DETAIL ROW
================================================================ */

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center">
      <View className="h-[36px] w-[36px] items-center justify-center rounded-[12px] bg-slate-50">
        {icon}
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[9px] font-bold uppercase tracking-[0.4px] text-ink-muted">
          {label}
        </Text>

        <Text
          numberOfLines={3}
          className="mt-0.5 text-[11px] font-extrabold text-ink-dark"
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ================================================================
   ACTION ROW
================================================================ */

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
      className="flex-row items-center px-5 py-4"
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
   CLAY ALERT MODAL
================================================================ */

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
  buttons: ClayAlertButton[];
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
              let background = "bg-ocean-400";
              let textColor = "text-white";
              let border = "border-ocean-400";

              if (button.style === "cancel") {
                background = "bg-white";
                textColor = "text-ocean-700";
                border = "border-ocean-200";
              }

              if (button.style === "destructive") {
                background = "bg-red-500";
                textColor = "text-white";
                border = "border-red-500";
              }

              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    button.onPress();
                    onClose();
                  }}
                  className={`min-h-[48px] min-w-[100px] flex-1 items-center justify-center rounded-full border ${border} ${background}`}
                >
                  <Text className={`text-[14px] font-extrabold ${textColor}`}>
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
