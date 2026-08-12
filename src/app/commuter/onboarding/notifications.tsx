import Constants from "expo-constants"; // ✅ added
import * as Notifications from "expo-notifications";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  MessageSquare,
  Smartphone,
} from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCommuterStore } from "@/src/shared/store/commuterStore";
import OceanBackground from "../../../src/shared/components/clay/OceanBackground";
import { colors } from "../../../src/shared/constants/theme";
import { completeCommuterProfile } from "../../../src/shared/services/CommuterAuthService";

export default function CommuterNotificationsScreen() {
  const params = useLocalSearchParams<{
    name?: string;
    mobile?: string;
  }>();

  const name = Array.isArray(params.name)
    ? params.name[0]
    : (params.name ?? "");

  const mobile = Array.isArray(params.mobile)
    ? params.mobile[0]
    : (params.mobile ?? "");

  const completeOnboarding = useCommuterStore(
    (state) => state.completeOnboarding,
  );

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const getExpoPushToken = async (): Promise<string | null> => {
    try {
      if (!permissionGranted) {
        return null;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: colors.primaryDark,
        });
      }

      // ✅ FIX: pass projectId to getExpoPushTokenAsync
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.warn("⚠️ No EAS project ID found – cannot get push token");
        return null;
      }

      const tokenResult = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      return tokenResult.data || null;
    } catch (error) {
      console.error(" Failed to get Expo push token:", error);
      return null;
    }
  };

  const requestNotifications = async () => {
    if (requesting || saving) return;

    try {
      setRequesting(true);

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();

        finalStatus = status;
      }

      if (finalStatus === "granted") {
        setPermissionGranted(true);
        return;
      }

      setPermissionGranted(false);

      Alert.alert(
        "Notifications are disabled",
        "You can enable notifications later from your device settings.",
      );
    } catch (error) {
      console.error(" Notification permission error:", error);

      Alert.alert(
        "Something went wrong",
        "We couldn't set up notifications right now. You can continue and enable them later.",
      );
    } finally {
      setRequesting(false);
    }
  };

  const handleContinue = async () => {
    if (saving || requesting) return;

    if (!name.trim()) {
      Alert.alert(
        "Name required",
        "Your name is missing. Please go back and enter your name.",
      );
      return;
    }

    if (!mobile.trim()) {
      Alert.alert(
        "Mobile number required",
        "Your mobile number is missing. Please go back and enter it.",
      );
      return;
    }

    try {
      setSaving(true);

      let expoPushToken: string | null = null;

      if (permissionGranted) {
        expoPushToken = await getExpoPushToken();

        if (!expoPushToken) {
          console.warn(
            "⚠️ Notification permission granted but no Expo push token was returned.",
          );
        }
      }

      console.log("🚀 Completing commuter onboarding...");
      console.log("Name:", name);
      console.log("Mobile:", mobile);
      console.log("Notifications:", permissionGranted);
      console.log("Expo token:", expoPushToken ? "received" : "none");

      const result = await completeCommuterProfile({
        name: name.trim(),
        mobile: mobile.trim(),
        notificationsEnabled: permissionGranted,
        expoPushToken,
      });

      if (!result.success) {
        Alert.alert(
          "Unable to complete onboarding",
          result.error ||
            "We couldn't save your commuter profile. Please try again.",
        );

        return;
      }

      console.log("✅ Commuter profile saved:", result.userId);

      completeOnboarding({
        name: name.trim(),
        mobile: mobile.trim(),
        notificationsEnabled: permissionGranted,
      });

      router.replace("/commuter/(tabs)");
    } catch (error) {
      console.error("❌ Onboarding completion error:", error);

      Alert.alert(
        "Something went wrong",
        "We couldn't complete your onboarding. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <OceanBackground intensity={0.35}>
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-6">
          <View className="flex-row items-center pt-3">
            <Pressable
              disabled={saving}
              onPress={() => router.back()}
              className="h-[46px] w-[46px] items-center justify-center rounded-full border border-white/90 bg-clay-surface shadow-clay-sm active:scale-95"
            >
              <ArrowLeft
                size={20}
                color={colors.primaryDark}
                strokeWidth={2.4}
              />
            </Pressable>

            <View className="ml-4">
              <Text className="text-[11px] font-bold tracking-[1.5px] text-ocean-700">
                STEP 3 OF 3
              </Text>

              <Text className="mt-0.5 text-[13px] font-medium text-ink-secondary">
                Notification preferences
              </Text>
            </View>
          </View>

          <View className="mt-7 flex-row gap-2">
            <View className="h-[5px] flex-1 rounded-full bg-ocean-400" />
            <View className="h-[5px] flex-1 rounded-full bg-ocean-400" />
            <View className="h-[5px] flex-1 rounded-full bg-ocean-400" />
          </View>

          <ScrollView
            className="mt-2 flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 28,
              paddingBottom: 24,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="items-start">
              <View className="mb-7 h-[88px] w-[88px] items-center justify-center rounded-[30px] border border-white/90 bg-clay-surface shadow-clay">
                <View className="h-[62px] w-[62px] items-center justify-center rounded-full bg-ocean-100">
                  <Bell size={32} color={colors.primaryDark} strokeWidth={2} />
                </View>

                {permissionGranted && (
                  <View className="absolute -right-1 -top-1 h-[28px] w-[28px] items-center justify-center rounded-full border-2 border-white bg-green-500">
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </View>

              <Text className="text-[31px] font-extrabold leading-[37px] text-ink-dark">
                Never miss
                {"\n"}
                your ride.
              </Text>

              <Text className="mt-4 max-w-[335px] text-[14px] leading-[21px] text-ink-secondary">
                Get timely updates about your jeepney, queue position, and
                important terminal announcements.
              </Text>

              <View className="mt-8 w-full gap-3">
                <View className="flex-row items-center rounded-[22px] border border-white/90 bg-clay-surface/90 p-4 shadow-clay-sm">
                  <View className="h-[44px] w-[44px] items-center justify-center rounded-[15px] bg-ocean-100">
                    <Bell size={20} color={colors.primaryDark} />
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-[13px] font-bold text-ink-dark">
                      Jeepney arrival
                    </Text>

                    <Text className="mt-0.5 text-[11px] leading-[16px] text-ink-secondary">
                      Know when your queued jeepney arrives.
                    </Text>
                  </View>

                  <View className="h-[24px] w-[24px] items-center justify-center rounded-full bg-green-100">
                    <Check size={14} color="#16A34A" strokeWidth={3} />
                  </View>
                </View>

                <View className="flex-row items-center rounded-[22px] border border-white/90 bg-clay-surface/90 p-4 shadow-clay-sm">
                  <View className="h-[44px] w-[44px] items-center justify-center rounded-[15px] bg-ocean-100">
                    <Smartphone size={20} color={colors.primaryDark} />
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-[13px] font-bold text-ink-dark">
                      Queue updates
                    </Text>

                    <Text className="mt-0.5 text-[11px] leading-[16px] text-ink-secondary">
                      Stay updated as the terminal queue changes.
                    </Text>
                  </View>

                  <View className="h-[24px] w-[24px] items-center justify-center rounded-full bg-green-100">
                    <Check size={14} color="#16A34A" strokeWidth={3} />
                  </View>
                </View>

                <View className="flex-row items-center rounded-[22px] border border-white/90 bg-clay-surface/90 p-4 shadow-clay-sm">
                  <View className="h-[44px] w-[44px] items-center justify-center rounded-[15px] bg-ocean-100">
                    <MessageSquare size={20} color={colors.primaryDark} />
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-[13px] font-bold text-ink-dark">
                      SMS alerts
                    </Text>

                    <Text className="mt-0.5 text-[11px] leading-[16px] text-ink-secondary">
                      Receive important updates on your mobile.
                    </Text>
                  </View>

                  <View className="h-[24px] w-[24px] items-center justify-center rounded-full bg-green-100">
                    <Check size={14} color="#16A34A" strokeWidth={3} />
                  </View>
                </View>
              </View>

              {mobile.length > 0 && (
                <View className="mt-5 w-full flex-row items-center rounded-[18px] bg-ocean-100/70 p-3">
                  <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-white/80">
                    <Smartphone size={16} color={colors.primaryDark} />
                  </View>

                  <View className="ml-3">
                    <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-ocean-700">
                      Notifications for
                    </Text>

                    <Text className="mt-0.5 text-[12px] font-semibold text-ink-dark">
                      {mobile}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View className="pb-5 pt-3">
            {!permissionGranted && (
              <Pressable
                disabled={requesting || saving}
                onPress={requestNotifications}
                className="mb-3 min-h-[56px] flex-row items-center justify-center rounded-full border border-ocean-300 bg-clay-surface px-6 shadow-clay-sm active:scale-[0.98]"
              >
                <Bell size={19} color={colors.primaryDark} strokeWidth={2.3} />

                <Text className="ml-2 text-[14px] font-extrabold text-ocean-700">
                  {requesting ? "Setting up..." : "Enable Notifications"}
                </Text>
              </Pressable>
            )}

            <Pressable
              disabled={saving || requesting}
              onPress={handleContinue}
              className={`min-h-[60px] flex-row items-center justify-center rounded-full border border-white/90 px-6 shadow-clay-floating active:scale-[0.98] ${
                saving ? "bg-ocean-300" : "bg-ocean-400"
              }`}
            >
              <Text className="text-center text-[16px] font-extrabold text-white">
                {saving
                  ? "Setting up Smart Queue..."
                  : permissionGranted
                    ? "Enter Smart Queue"
                    : "Continue without Notifications"}
              </Text>

              {!saving && (
                <View className="ml-3 h-[34px] w-[34px] items-center justify-center rounded-full bg-white/20">
                  <ArrowRight size={19} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              )}
            </Pressable>

            <Text className="mt-3 px-4 text-center text-[10px] leading-[15px] text-ink-muted">
              You can change notification preferences later in your profile
              settings.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </OceanBackground>
  );
}
