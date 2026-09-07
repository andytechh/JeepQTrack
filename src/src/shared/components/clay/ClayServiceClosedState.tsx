import { Moon } from "lucide-react-native";
import { Text, View } from "react-native";
import { colors } from "../../constants/theme";

export default function ServiceClosedState({
  nextOpenLabel,
  message = "Jeepney tracking and queue updates run from 5:40 AM to 8:00 PM.",
}: {
  nextOpenLabel: string;
  message?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="h-[64px] w-[64px] items-center justify-center rounded-[21px] bg-ocean-100">
        <Moon size={28} color={colors.primaryDark} strokeWidth={2} />
      </View>

      <Text className="mt-5 text-[17px] font-extrabold text-ink-dark text-center">
        Smart Queue is closed for the day
      </Text>

      <Text className="mt-2 text-center text-[12px] leading-[18px] text-ink-secondary">
        {message}
        {"\n"}Please check back tomorrow at {nextOpenLabel}.
      </Text>
    </View>
  );
}
