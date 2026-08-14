import { router } from "expo-router";
import { ChevronRight, MapPin } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "../../src/shared/components/clay/OceanBackground";
import { colors } from "../../src/shared/constants/theme";
import { useCommuterStore } from "../../src/shared/store/commuterStore";

export default function CommuterEntry() {
  const profile = useCommuterStore((state) => state.profile);

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setChecking(false);
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!checking && profile?.onboardingCompleted) {
      router.replace("/commuter/(tabs)");
    }
  }, [checking, profile?.onboardingCompleted]);

  if (checking) {
    return (
      <OceanBackground intensity={0.45}>
        <SafeAreaView className="flex-1 items-center justify-center">
          <View className="h-[64px] w-[64px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface shadow-clay">
            <ActivityIndicator size="small" color={colors.primary} />
          </View>

          <Text className="mt-4 text-[12px] font-semibold text-ink-secondary">
            Loading Smart Queue...
          </Text>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  if (profile?.onboardingCompleted) {
    return null;
  }

  const handleGetStarted = () => {
    router.push("/commuter/onboarding/name");
  };

  return (
    <OceanBackground intensity={0.45}>
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-between px-6 pb-8 pt-8">
          {/* BRAND */}
          <View className="items-center">
            <View className="h-[62px] w-[62px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface shadow-clay">
              <Text className="text-[30px]">🐋</Text>
            </View>

            <Text className="mt-4 text-[13px] font-bold tracking-[2px] text-ocean-700">
              DONSOL
            </Text>

            <Text className="mt-1 text-[30px] font-extrabold text-ink-dark">
              Smart Queue
            </Text>

            <View className="mt-2 flex-row items-center">
              <MapPin size={14} color={colors.primaryDark} />

              <Text className="ml-1 text-[12px] font-medium text-ink-secondary">
                Donsol - Daraga
              </Text>
              <MapPin size={14} color={colors.primaryDark} />
            </View>
          </View>

          {/* MAIN */}
          <View className="items-center">
            <View className="mb-8 h-[220px] w-[220px] items-center justify-center rounded-full bg-ocean-100/70">
              <View className="h-[175px] w-[175px] items-center justify-center rounded-full bg-ocean-200/80 shadow-clay">
                <Image
                  source={require("../../../assets/images/logo.png")}
                  className="w-40 h-40 rounded-full border-2 border-blue-500"
                />
              </View>
            </View>

            <Text className="px-4 text-center text-[30px] font-extrabold leading-[36px] text-ink-dark">
              Ride smarter.
              {"\n"}
              Wait less.
            </Text>

            <Text className="mt-4 max-w-[320px] text-center text-[14px] leading-[21px] text-ink-secondary">
              Check the jeepney queue, occupancy, estimated departure, and live
              status before heading to the terminal.
            </Text>
          </View>

          {/* CTA */}
          <View>
            <Pressable
              onPress={handleGetStarted}
              className="min-h-[60px] flex-row items-center justify-center rounded-full border border-white/90 bg-ocean-400 px-6 shadow-clay-floating active:scale-[0.98]"
            >
              <Text className="text-[16px] font-extrabold text-white">
                Get Started
              </Text>

              <View className="ml-3 h-[34px] w-[34px] items-center justify-center rounded-full bg-white/20">
                <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </Pressable>

            <Text className="mt-3 text-center text-[10px] text-ink-muted">
              Smart transportation for Donsol commuters
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </OceanBackground>
  );
}
