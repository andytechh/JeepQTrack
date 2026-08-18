import { Plus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

interface ChatReactionPickerProps {
  onReaction: (emoji: string) => void;
  onMore: () => void;
  isMine?: boolean;
}

export default function ChatReactionPicker({
  onReaction,
  onMore,
}: ChatReactionPickerProps) {
  return (
    <View
      className="absolute z-50 flex-row items-center rounded-[24px] bg-white px-2 py-2"
      style={{
        left: 16,
        right: 16,
        bottom: 88,

        shadowColor: "#0284C7",
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 0.2,
        shadowRadius: 18,
        elevation: 12,
      }}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <Pressable
          key={emoji}
          onPress={() => onReaction(emoji)}
          className="mx-0.5 h-[42px] w-[42px] items-center justify-center rounded-[15px] bg-[#E0F2FE]"
        >
          <Text className="text-[22px]">{emoji}</Text>
        </Pressable>
      ))}

      <Pressable
        onPress={onMore}
        className="ml-1 h-[42px] w-[42px] items-center justify-center rounded-[15px] bg-[#F1F5F9]"
      >
        <Plus size={20} color="#475569" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}
