import { Bell, BellOff } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text } from "react-native";

export default function TerminalNotifyToggle({
  terminalId,
  label,
  isSubscribed,
  remainingMinutes,
  saving,
  onToggle,
}: {
  terminalId: number;
  label: string;
  isSubscribed: boolean;
  remainingMinutes: number;
  saving: boolean;
  onToggle: (terminalId: number) => void;
}) {
  const hours = Math.floor(remainingMinutes / 60);
  const mins = remainingMinutes % 60;

  return (
    <Pressable
      disabled={saving}
      onPress={() => onToggle(terminalId)}
      className={`flex-row items-center rounded-full px-3 py-1.5 ${
        isSubscribed ? "bg-white/25" : "bg-white/10"
      }`}
    >
      {saving ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : isSubscribed ? (
        <Bell size={12} color="#fff" strokeWidth={2.3} />
      ) : (
        <BellOff size={12} color="rgba(255,255,255,0.6)" strokeWidth={2.3} />
      )}
      <Text
        className={`ml-1.5 text-[10px] font-extrabold ${
          isSubscribed ? "text-white" : "text-white/60"
        }`}
      >
        {isSubscribed ? `${label} · ${hours}h${mins}m left` : label}
      </Text>
    </Pressable>
  );
}
