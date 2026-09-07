import { Bell, BellOff } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { useJeepneyNotify } from "../../hooks/useJeepneyNotify";

export default function JeepneyNotifyButton({
  jeepneyId,
}: {
  jeepneyId: string;
}) {
  const { subscribed, toggle, saving } = useJeepneyNotify(jeepneyId);
  return (
    <Pressable
      disabled={saving}
      onPress={toggle}
      className={`mt-4 flex-row items-center justify-center rounded-[16px] py-2.5 ${
        subscribed ? "bg-ocean-400" : "bg-ocean-50"
      }`}
    >
      {saving ? (
        <ActivityIndicator
          size="small"
          color={subscribed ? "#fff" : "#0284C7"}
        />
      ) : subscribed ? (
        <Bell size={14} color="#fff" strokeWidth={2.3} />
      ) : (
        <BellOff size={14} color="#0284C7" strokeWidth={2.3} />
      )}
      <Text
        className={`ml-2 text-[11px] font-extrabold ${subscribed ? "text-white" : "text-ocean-700"}`}
      >
        {subscribed ? "You'll be notified when it departs" : "Notify me"}
      </Text>
    </Pressable>
  );
}
