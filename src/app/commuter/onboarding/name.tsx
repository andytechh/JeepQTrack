import { router } from "expo-router";
import { UserRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import OceanBackground from "../../../src/shared/components/clay/OceanBackground";
import { colors } from "../../../src/shared/constants/theme";
import { checkExistingCommuter } from "../../../src/shared/services/CommuterAuthService";

export default function NameScreen() {
  const [name, setName] = useState("");
  const [checking, setChecking] = useState(true);
  const [existingUser, setExistingUser] = useState<any>(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      const commuter = await checkExistingCommuter();

      if (commuter) {
        setExistingUser(commuter);
        setShowWelcomeBack(true);
      }
    } catch (error) {
      console.error("Failed to check existing commuter:", error);
    } finally {
      setChecking(false);
    }
  };

  const handleContinue = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    router.push({
      pathname: "./mobile",
      params: {
        name: trimmedName,
      },
    });
  };

  const handleExistingProfile = () => {
    setShowWelcomeBack(false);
    router.replace("/commuter/(tabs)");
  };

  if (checking) {
    return (
      <OceanBackground intensity={0.32}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color={colors.primaryDark} />

          <Text className="mt-3 text-[12px] font-semibold text-ink-secondary">
            Checking your Smart Queue profile...
          </Text>
        </View>
      </OceanBackground>
    );
  }

  return (
    <OceanBackground intensity={0.32}>
      <View className="flex-1 px-6 pt-20">
        <Text className="text-sm font-bold uppercase tracking-widest text-ocean-700">
          SMART QUEUE
        </Text>

        <Text className="mt-4 text-[36px] font-extrabold leading-[42px] text-ink-dark">
          What's your name?
        </Text>

        <Text className="mt-3 text-[15px] leading-6 text-ink-secondary">
          Tell us your name so we can personalize your Smart Queue experience.
        </Text>

        <View className="mt-10 flex-row items-center rounded-[24px] border border-white/90 bg-clay-surface px-5 shadow-clay-sm">
          <UserRound size={20} color={colors.primaryDark} strokeWidth={2.2} />

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            className="ml-3 flex-1 py-5 text-[16px] font-semibold text-ink-dark"
          />
        </View>

        <View className="flex-1" />

        <Pressable
          disabled={!name.trim()}
          onPress={handleContinue}
          className={`mb-8 items-center rounded-full py-5 ${
            name.trim() ? "bg-ocean-400" : "bg-ocean-200"
          }`}
        >
          <Text
            className={`font-extrabold ${
              name.trim() ? "text-white" : "text-white/60"
            }`}
          >
            Continue
          </Text>
        </Pressable>

        <Modal
          visible={showWelcomeBack}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View className="flex-1 items-center justify-center bg-black/35 px-6">
            <View className="w-full rounded-[30px] border border-white/90 bg-clay-surface p-6 shadow-clay-floating">
              <View className="mb-5 h-[58px] w-[58px] items-center justify-center rounded-full bg-ocean-100">
                <UserRound
                  size={27}
                  color={colors.primaryDark}
                  strokeWidth={2.2}
                />
              </View>

              <Text className="text-[25px] font-extrabold text-ink-dark">
                Welcome back
              </Text>

              <Text className="mt-2 text-[14px] leading-[21px] text-ink-secondary">
                We found your existing Smart Queue profile on this device.
              </Text>

              {existingUser && (
                <View className="mt-5 rounded-[20px] bg-ocean-100/70 p-4">
                  <Text className="text-[10px] font-bold uppercase tracking-[1px] text-ocean-700">
                    Your profile
                  </Text>

                  <Text className="mt-1 text-[17px] font-extrabold text-ink-dark">
                    {existingUser.display_name}
                  </Text>

                  {existingUser.phone_number && (
                    <Text className="mt-1 text-[12px] font-medium text-ink-secondary">
                      {existingUser.phone_number}
                    </Text>
                  )}
                </View>
              )}

              <Pressable
                onPress={handleExistingProfile}
                className="mt-6 min-h-[56px] items-center justify-center rounded-full bg-ocean-400"
              >
                <Text className="text-[15px] font-extrabold text-white">
                  Continue as {existingUser?.display_name || "commuter"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowWelcomeBack(false)}
                className="mt-3 min-h-[50px] items-center justify-center rounded-full border border-ocean-200 bg-white/70"
              >
                <Text className="text-[14px] font-bold text-ocean-700">
                  Use a different profile
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </OceanBackground>
  );
}
