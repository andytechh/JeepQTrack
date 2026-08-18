import { ArrowLeft, MessageCircle, RefreshCw } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatHeaderProps {
  onBack: () => void;
  onRefresh: () => void;
  unreadCount?: number;
}

export default function ChatHeader({
  onBack,
  onRefresh,
  unreadCount = 0,
}: ChatHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-[#F8FCFF]"
      style={{
        paddingTop: Math.max(insets.top, 8) + 4,
      }}
    >
      <View
        className="flex-row items-center px-4 pb-3"
        style={{
          minHeight: 72,
          shadowColor: "#38BDF8",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
          elevation: 5,
        }}
      >
        <Pressable
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-[16px] bg-[#E0F2FE]"
          style={{
            shadowColor: "#7DD3FC",
            shadowOffset: { width: 2, height: 3 },
            shadowOpacity: 0.16,
            shadowRadius: 5,
            elevation: 3,
          }}
        >
          <ArrowLeft size={22} color="#0F172A" strokeWidth={2.5} />
        </Pressable>

        <View className="ml-3 flex-1 flex-row items-center">
          <View
            className="h-11 w-11 items-center justify-center rounded-[15px] bg-[#BAE6FD]"
            style={{
              shadowColor: "#38BDF8",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.16,
              shadowRadius: 5,
              elevation: 3,
            }}
          >
            <MessageCircle size={21} color="#0284C7" strokeWidth={2.5} />
          </View>

          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text className="text-[18px] font-extrabold text-[#0F172A]">
                Staff Chat
              </Text>

              {unreadCount > 0 && (
                <View className="ml-2 min-w-[20px] items-center rounded-full bg-[#EF4444] px-1.5 py-0.5">
                  <Text className="text-[9px] font-extrabold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>

            <View className="mt-0.5 flex-row items-center">
              <View className="mr-1.5 h-[7px] w-[7px] rounded-full bg-[#22C55E]" />

              <Text className="text-[11px] font-semibold text-[#94A3B8]">
                Staff General Chat
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={onRefresh}
          className="h-11 w-11 items-center justify-center rounded-[16px] bg-[#E0F2FE]"
          style={{
            shadowColor: "#7DD3FC",
            shadowOffset: { width: 2, height: 3 },
            shadowOpacity: 0.16,
            shadowRadius: 5,
            elevation: 3,
          }}
        >
          <RefreshCw size={20} color="#0284C7" strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}
