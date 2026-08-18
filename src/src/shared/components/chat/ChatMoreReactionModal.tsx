import { X } from "lucide-react-native";
import { Modal, Pressable, Text, View } from "react-native";

const ALL_REACTIONS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "😡",
  "👏",
  "🔥",
  "🎉",
  "💯",
  "😍",
  "🤔",
  "😎",
  "🙏",
  "💙",
  "💪",
  "🙌",
  "🤣",
  "😭",
  "😱",
  "🥰",
  "😘",
  "🤗",
  "👀",
];

interface ChatMoreReactionsModalProps {
  visible: boolean;
  onClose: () => void;
  onReaction: (emoji: string) => void;
}

export default function ChatMoreReactionsModal({
  visible,
  onClose,
  onReaction,
}: ChatMoreReactionsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/30 px-5"
        onPress={onClose}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="w-full max-w-[380px] rounded-[28px] bg-[#F8FCFF] p-5"
          style={{
            shadowColor: "#0284C7",
            shadowOffset: {
              width: 0,
              height: 12,
            },
            shadowOpacity: 0.25,
            shadowRadius: 24,
            elevation: 15,
          }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-[19px] font-extrabold text-[#0F172A]">
                Reactions
              </Text>

              <Text className="mt-1 text-[11px] font-medium text-[#94A3B8]">
                Choose a reaction
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-[13px] bg-[#E0F2FE]"
            >
              <X size={18} color="#475569" />
            </Pressable>
          </View>

          <View className="flex-row flex-wrap justify-center">
            {ALL_REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => onReaction(emoji)}
                className="m-1 h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-white"
                style={{
                  shadowColor: "#7DD3FC",
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.12,
                  shadowRadius: 5,
                  elevation: 2,
                }}
              >
                <Text className="text-[25px]">{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
