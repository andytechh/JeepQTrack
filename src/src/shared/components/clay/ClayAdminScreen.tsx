import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "@/src/shared/components/clay/OceanBackground";

interface ClayAdminScreenProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function ClayAdminScreen({
  title,
  subtitle,
  children,
}: ClayAdminScreenProps) {
  return (
    <OceanBackground intensity={0.28}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 140,
          }}
        >
          <View className="mb-6">
            <Text className="text-[10px] font-extrabold uppercase tracking-[1.4px] text-ocean-700">
              SMART QUEUE
            </Text>

            <Text className="mt-1 text-[25px] font-extrabold text-ink-dark">
              {title}
            </Text>

            {subtitle && (
              <Text className="mt-1 text-[11px] font-medium text-ink-muted">
                {subtitle}
              </Text>
            )}
          </View>

          {children}
        </ScrollView>
      </SafeAreaView>
    </OceanBackground>
  );
}
