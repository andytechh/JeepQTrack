import { ReactNode } from "react";
import { Text, View } from "react-native";

interface ClayStatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
}

export default function ClayStatCard({
  label,
  value,
  icon,
  subtitle,
}: ClayStatCardProps) {
  return (
    <View
      className="flex-1 rounded-[24px] border border-white/90 bg-clay-surface p-4"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="h-[38px] w-[38px] items-center justify-center rounded-[14px] bg-ocean-100">
          {icon}
        </View>
      </View>

      <Text className="mt-4 text-[10px] font-bold uppercase tracking-[0.8px] text-ink-muted">
        {label}
      </Text>

      <Text className="mt-1 text-[26px] font-extrabold text-ink-dark">
        {value}
      </Text>

      {subtitle && (
        <Text className="mt-0.5 text-[10px] font-medium text-ink-secondary">
          {subtitle}
        </Text>
      )}
    </View>
  );
}
