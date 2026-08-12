import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Smartphone,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "../../../src/shared/components/clay/OceanBackground";
import { colors } from "../../../src/shared/constants/theme";

export default function CommuterMobileScreen() {
  const params = useLocalSearchParams<{
    name?: string;
  }>();

  const name = Array.isArray(params.name)
    ? params.name[0]
    : (params.name ?? "");

  const [mobile, setMobile] = useState("");

  const normalizedMobile = useMemo(() => {
    const digits = mobile.replace(/\D/g, "");

    if (digits.startsWith("09") && digits.length === 11) {
      return `+63${digits.substring(1)}`;
    }

    if (digits.startsWith("639") && digits.length === 12) {
      return `+${digits}`;
    }

    if (digits.startsWith("63") && digits.length === 12) {
      return `+${digits}`;
    }

    return "";
  }, [mobile]);

  const isValid = normalizedMobile.length === 13;

  const handleMobileChange = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, "");
    setMobile(cleaned);
  };

  const handleContinue = () => {
    if (!name.trim()) {
      router.replace("./name");
      return;
    }

    if (!isValid) {
      return;
    }

    router.push({
      pathname: "./notifications",
      params: {
        name: name.trim(),
        mobile: normalizedMobile,
      },
    });
  };

  return (
    <OceanBackground intensity={0.32}>
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="flex-1 px-6">
            <View className="flex-row items-center pt-3">
              <Pressable
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
                  STEP 2 OF 3
                </Text>

                <Text className="mt-0.5 text-[13px] font-medium text-ink-secondary">
                  Contact information
                </Text>
              </View>
            </View>

            <View className="mt-7 flex-row gap-2">
              <View className="h-[5px] flex-1 rounded-full bg-ocean-400" />
              <View className="h-[5px] flex-1 rounded-full bg-ocean-400" />
              <View className="h-[5px] flex-1 rounded-full bg-ocean-200" />
            </View>

            <ScrollView
              className="mt-2 flex-1"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              contentContainerStyle={{
                paddingTop: 28,
                paddingBottom: 28,
              }}
            >
              <View>
                <View className="mb-7 h-[88px] w-[88px] items-center justify-center rounded-[30px] border border-white/90 bg-clay-surface shadow-clay">
                  <View className="h-[62px] w-[62px] items-center justify-center rounded-full bg-ocean-100">
                    <Smartphone
                      size={32}
                      color={colors.primaryDark}
                      strokeWidth={2}
                    />
                  </View>
                </View>

                <Text className="text-[31px] font-extrabold leading-[37px] text-ink-dark">
                  What's your
                  {"\n"}
                  mobile number?
                </Text>

                <Text className="mt-4 max-w-[335px] text-[14px] leading-[21px] text-ink-secondary">
                  We'll use your mobile number for important Smart Queue alerts
                  and SMS notifications.
                </Text>

                <View
                  className={`mt-8 min-h-[68px] flex-row items-center rounded-[22px] border bg-clay-surface px-5 shadow-clay-sm ${
                    mobile.length === 0
                      ? "border-white/90"
                      : isValid
                        ? "border-green-300"
                        : "border-ocean-300"
                  }`}
                >
                  <View className="mr-3 h-[34px] min-w-[45px] items-center justify-center rounded-[11px] bg-ocean-100">
                    <Text className="text-[12px] font-extrabold text-ocean-700">
                      +63
                    </Text>
                  </View>

                  <TextInput
                    value={mobile}
                    onChangeText={handleMobileChange}
                    placeholder="917 123 4567"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                    className="flex-1 text-[16px] font-semibold text-ink-dark"
                    maxLength={13}
                  />

                  {isValid && (
                    <CheckCircle2 size={21} color="#16A34A" strokeWidth={2.5} />
                  )}
                </View>

                {mobile.length > 0 && !isValid && (
                  <Text className="ml-2 mt-2 text-[11px] font-medium text-ink-muted">
                    Enter a valid Philippine mobile number.
                  </Text>
                )}

                {isValid && (
                  <Text className="ml-2 mt-2 text-[11px] font-medium text-green-600">
                    Number accepted: {normalizedMobile}
                  </Text>
                )}

                <View className="mt-6 flex-row rounded-[20px] border border-white/80 bg-ocean-100/70 p-4">
                  <View className="h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-white/80">
                    <Smartphone size={16} color={colors.primaryDark} />
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-[12px] font-bold text-ink-dark">
                      SMS notifications
                    </Text>

                    <Text className="mt-1 text-[11px] leading-[17px] text-ink-secondary">
                      Get notified when your jeepney arrives, your queue
                      position changes, or a dispatch update is available.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View className="pb-6 pt-3">
              <Pressable
                disabled={!isValid}
                onPress={handleContinue}
                className={`min-h-[60px] flex-row items-center justify-center rounded-full border border-white/90 px-6 shadow-clay-floating ${
                  isValid ? "bg-ocean-400" : "bg-ocean-200 opacity-70"
                }`}
              >
                <Text className="text-[16px] font-extrabold text-white">
                  Continue
                </Text>

                <View className="ml-3 h-[34px] w-[34px] items-center justify-center rounded-full bg-white/20">
                  <ArrowRight size={19} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </Pressable>

              <Text className="mt-3 text-center text-[10px] text-ink-muted">
                Your number will only be used for Smart Queue notifications.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </OceanBackground>
  );
}
