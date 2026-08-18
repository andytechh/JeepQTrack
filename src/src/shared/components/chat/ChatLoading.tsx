import { ActivityIndicator, Text, View } from "react-native";

export default function ChatLoading() {
  return (
    <View className="flex-1 items-center justify-center bg-[#EEF8FF] px-6">
      <View
        className="w-[85%] items-center rounded-[28px] bg-white py-8"
        style={{
          shadowColor: "#7DD3FC",
          shadowOffset: {
            width: 0,
            height: 10,
          },
          shadowOpacity: 0.2,
          shadowRadius: 18,
          elevation: 8,
        }}
      >
        <ActivityIndicator size="large" color="#0284C7" />

        <Text className="mt-3.5 text-[14px] font-semibold text-[#475569]">
          Loading staff chat...
        </Text>
      </View>
    </View>
  );
}
