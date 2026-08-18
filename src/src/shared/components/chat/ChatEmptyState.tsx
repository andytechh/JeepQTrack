import { MessageCircle } from "lucide-react-native";
import { Text, View } from "react-native";

export default function ChatEmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="mb-5 h-[90px] w-[90px] items-center justify-center rounded-[30px] bg-[#BAE6FD]"
        style={{
          shadowColor: "#38BDF8",
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.18,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <MessageCircle size={42} color="#0284C7" strokeWidth={1.8} />
      </View>

      <Text className="text-[19px] font-extrabold text-[#0F172A]">
        No messages yet
      </Text>

      <Text className="mt-1.5 text-center text-[13px] leading-[19px] text-[#475569]">
        Start a conversation with the staff.
      </Text>
    </View>
  );
}
