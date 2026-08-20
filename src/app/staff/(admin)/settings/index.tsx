import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  Bell,
  BellOff,
  ChevronRight,
  CircleHelp,
  FileText,
  Info,
  LogOut,
  ShieldCheck,
  Smartphone,
  UserRound,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "@/src/shared/components/clay/OceanBackground";
import { supabase } from "@/src/shared/config/supabase";
import { colors } from "@/src/shared/constants/theme";
import { useAdminProfile } from "@/src/shared/hooks/admin/useAdminProfile";

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

export default function AdminSettingsScreen() {
  const { profile, loading, refreshing, error, refresh } = useAdminProfile();

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
      buttons: AlertButton[] = [
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
    },
    [],
  );

  const hideAlert = useCallback(() => {
    setAlertConfig((previous) => ({
      ...previous,
      visible: false,
    }));
  }, []);

  useEffect(() => {
    if (!profile) {
      setPushEnabled(false);
      return;
    }

    setPushEnabled(Boolean(profile.expo_push_token));
  }, [profile]);

  const handleTogglePush = async () => {
    if (!profile || togglingPush) {
      return;
    }

    try {
      setTogglingPush(true);

      if (pushEnabled) {
        const { error: updateError } = await supabase
          .from("users")
          .update({
            expo_push_token: null,
          })
          .eq("id", profile.id);

        if (updateError) {
          throw updateError;
        }

        setPushEnabled(false);

        showAlert(
          "Notifications disabled",
          "This admin device will no longer receive Smart Queue push notifications.",
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

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      if (!token.data) {
        showAlert(
          "Unable to enable notifications",
          "The device notification token could not be created.",
        );

        return;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          expo_push_token: token.data,
        })
        .eq("id", profile.id);

      if (updateError) {
        throw updateError;
      }

      setPushEnabled(true);

      showAlert(
        "Notifications enabled",
        "This admin device will now receive Smart Queue push notifications.",
      );
    } catch (err) {
      console.error("Admin notification toggle error:", err);

      showAlert(
        "Unable to update notifications",
        "We could not update your notification settings. Please try again.",
      );
    } finally {
      setTogglingPush(false);
    }
  };

  const handleSignOut = () => {
    showAlert(
      "Sign out",
      "Are you sure you want to sign out of the Smart Queue admin application?",
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
            if (signingOut) {
              return;
            }

            try {
              setSigningOut(true);

              const { error: signOutError } = await supabase.auth.signOut();

              if (signOutError) {
                throw signOutError;
              }

              router.replace("/staff/login");
            } catch (err) {
              console.error("Admin sign out error:", err);

              showAlert(
                "Unable to sign out",
                "Something went wrong while signing out. Please try again.",
              );
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/staff/(admin)/(tabs)");
  };

  if (loading) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface shadow-clay">
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </View>

            <Text className="mt-4 text-[14px] font-extrabold text-ink-dark">
              Loading settings...
            </Text>

            <Text className="mt-1 text-center text-[11px] text-ink-muted">
              Getting your admin preferences
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
            <Header onBack={handleBack} />

            <View className="mt-8 items-center rounded-[28px] border border-white/90 bg-clay-surface px-6 py-9 shadow-clay">
              <View className="h-[62px] w-[62px] items-center justify-center rounded-[21px] bg-red-50">
                <ShieldCheck size={28} color="#DC2626" strokeWidth={2.3} />
              </View>

              <Text className="mt-4 text-[17px] font-extrabold text-ink-dark">
                Settings unavailable
              </Text>

              <Text className="mt-2 text-center text-[11px] leading-[17px] text-ink-secondary">
                {error ?? "Your admin profile could not be loaded."}
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
          <Header onBack={handleBack} />

          {/* SETTINGS INTRO */}

          <View className="mt-5 rounded-[27px] border border-white/90 bg-clay-surface p-5 shadow-clay">
            <View className="flex-row items-center">
              <View className="h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-ocean-100">
                <ShieldCheck
                  size={25}
                  color={colors.primaryDark}
                  strokeWidth={2.2}
                />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[17px] font-extrabold text-ink-dark">
                  Admin Settings
                </Text>

                <Text className="mt-1 text-[11px] leading-[16px] text-ink-secondary">
                  Manage your Smart Queue admin application preferences.
                </Text>
              </View>
            </View>
          </View>

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
              <UserRound
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Account"
          />

          <View className="overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
            <SettingsActionRow
              icon={UserRound}
              title="My Profile"
              description="View and manage your admin profile"
              onPress={() => router.push("/staff/(admin)/profile")}
            />

            <Divider />

            <SettingsActionRow
              icon={ShieldCheck}
              title="Security"
              description="Review your account and authentication information"
              onPress={() => {
                showAlert(
                  "Security",
                  "Your Smart Queue admin account is authenticated through Supabase. For password or account security changes, contact the system administrator.",
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
              Admin Application
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

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={onBack}
        className="h-[44px] w-[44px] items-center justify-center rounded-[16px] border border-white/90 bg-clay-surface shadow-clay-sm"
      >
        <Text className="text-[24px] font-bold text-ink-dark">‹</Text>
      </Pressable>

      <View className="ml-3 flex-1">
        <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-ocean-700">
          ADMIN
        </Text>

        <Text className="mt-0.5 text-[19px] font-extrabold text-ink-dark">
          Settings
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
   SETTINGS ROW
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
