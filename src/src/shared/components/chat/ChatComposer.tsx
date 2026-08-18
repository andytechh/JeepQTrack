import { Send } from "lucide-react-native";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatComposerProps {
  value: string;
  sending: boolean;
  onChangeText: (text: string) => void;
  onSend: () => void;
}

export default function ChatComposer({
  value,
  sending,
  onChangeText,
  onSend,
}: ChatComposerProps) {
  const insets = useSafeAreaInsets();

  const canSend = value.trim().length > 0 && !sending;

  return (
    <View
      className="bg-[#EEF8FF] px-3 pt-2"
      style={{
        paddingBottom: Platform.OS === "ios" ? Math.max(insets.bottom, 10) : 8,
      }}
    >
      <View
        className="min-h-[58px] flex-row items-end rounded-[21px] bg-white pl-4 pr-2 py-2"
        style={{
          shadowColor: "#7DD3FC",
          shadowOffset: {
            width: 0,
            height: 5,
          },
          shadowOpacity: 0.17,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Message staff..."
          placeholderTextColor="#94A3B8"
          multiline
          maxLength={2000}
          editable={!sending}
          className="max-h-[105px] flex-1 px-0 py-2 text-[14px] leading-[19px] text-[#0F172A]"
          textAlignVertical="center"
          keyboardType="default"
          returnKeyType="default"
        />

        <View className="items-end justify-end">
          <Text className="mb-1 mr-1 text-[8px] text-[#94A3B8]">
            {value.length}/2000
          </Text>

          <Pressable
            disabled={!canSend}
            onPress={onSend}
            className="h-[43px] w-[43px] items-center justify-center rounded-[15px] bg-[#0284C7]"
            style={{
              opacity: canSend ? 1 : 0.45,
              shadowColor: "#0284C7",
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: canSend ? 0.25 : 0,
              shadowRadius: 7,
              elevation: canSend ? 4 : 0,
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
