import { Text, View } from "react-native";
import { Avatar } from "./Avatar";
import { Bubble } from "./Bubble";

export function Message({
  text,
  sender,
  timestamp,
  isOwn,
  read,
}: {
  text: string;
  sender: { name: string; initials: string; avatar?: string };
  timestamp: string;
  isOwn: boolean;
  read?: boolean;
}) {
  return (
    <View
      className={`flex-row gap-2 mb-4 ${isOwn ? "justify-end" : "justify-start"}`}
    >
      {!isOwn && (
        <Avatar
          fallback={sender.initials}
          uri={sender.avatar}
          size="default"
          className="self-end"
        />
      )}
      <View
        className={`flex-col max-w-[75%] ${isOwn ? "items-end self-end" : "items-start self-start"}`}
      >
        {!isOwn && (
          <Text className="text-xs text-light-text-muted dark:text-slate-400 mb-1 ml-1">
            {sender.name}
          </Text>
        )}
        <Bubble
          variant={isOwn ? "default" : "muted"}
          align={isOwn ? "end" : "start"}
        >
          {text}
        </Bubble>
        <View className="flex-row items-center gap-1 mt-1 px-1">
          <Text className="text-[10px] text-light-text-dim dark:text-slate-500">
            {timestamp}
          </Text>
          {isOwn && read && (
            <Text className="text-[10px] text-primary-500">✓✓</Text>
          )}
        </View>
      </View>
    </View>
  );
}
