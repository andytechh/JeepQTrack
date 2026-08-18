import { Check, CheckCheck } from "lucide-react-native";
import { memo, useMemo } from "react";
import { Pressable, Text, View } from "react-native";

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  updated_at?: string;
  edited_at?: string;
  deleted_at?: string;
  read_by?: string[];
  reactions?: Record<string, string[]>;
  status?: "sending" | "sent" | "delivered" | "read";
  sender?: {
    id: string;
    display_name: string;
    role: string;
    email?: string;
    avatar_url?: string;
  };
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  currentUserId?: string;
  onLongPress: (message: ChatMessage) => void;
  onReaction: (message: ChatMessage, emoji: string) => void;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "#7C3AED",
  dispatcher: "#0284C7",
  driver: "#16A34A",
  staff: "#64748B",
};

function ChatMessageBubbleComponent({
  message,
  currentUserId,
  onLongPress,
  onReaction,
}: ChatMessageBubbleProps) {
  const isMine = message.sender_id === currentUserId;
  const deleted = Boolean(message.deleted_at);

  const senderName = message.sender?.display_name || "Unknown Staff";

  const role = message.sender?.role?.toLowerCase() || "staff";

  const roleColor = ROLE_COLORS[role] || ROLE_COLORS.staff;

  const time = useMemo(() => {
    return new Date(message.created_at).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }, [message.created_at]);

  const reactions = Object.entries(message.reactions || {}).filter(
    ([, users]) => users.length > 0,
  );

  return (
    <View
      className={`mb-2.5 flex-row ${isMine ? "justify-end" : "justify-start"}`}
    >
      {!isMine && (
        <View
          className="mr-2 mt-auto h-9 w-9 items-center justify-center rounded-[13px]"
          style={{
            backgroundColor: roleColor,
            shadowColor: roleColor,
            shadowOffset: {
              width: 0,
              height: 3,
            },
            shadowOpacity: 0.18,
            shadowRadius: 5,
            elevation: 3,
          }}
        >
          <Text className="text-[13px] font-extrabold text-white">
            {senderName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View className={`max-w-[79%] ${isMine ? "items-end" : "items-start"}`}>
        {!isMine && (
          <View className="mb-1 ml-1 flex-row items-center">
            <Text className="text-[11px] font-extrabold text-[#0F172A]">
              {senderName}
            </Text>

            <View
              className="ml-1.5 rounded-md px-1.5 py-0.5"
              style={{
                backgroundColor: `${roleColor}18`,
              }}
            >
              <Text
                className="text-[7px] font-black"
                style={{
                  color: roleColor,
                }}
              >
                {role.toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        <Pressable
          onLongPress={() => onLongPress(message)}
          delayLongPress={250}
          className={`rounded-[19px] px-3.5 pb-2 pt-2.5 ${
            isMine
              ? "rounded-br-[5px] bg-[#DDF3FF]"
              : "rounded-bl-[5px] bg-white"
          }`}
          style={{
            shadowColor: "#7DD3FC",
            shadowOffset: {
              width: 0,
              height: 3,
            },
            shadowOpacity: 0.1,
            shadowRadius: 7,
            elevation: 3,
          }}
        >
          {deleted ? (
            <Text className="text-[13px] italic text-[#94A3B8]">
              Message deleted
            </Text>
          ) : (
            <Text
              className={`text-[14px] leading-5 ${
                isMine ? "text-[#075985]" : "text-[#0F172A]"
              }`}
            >
              {message.message}
            </Text>
          )}

          <View className="mt-1.5 flex-row items-center justify-end">
            {message.edited_at && !deleted && (
              <Text
                className={`mr-1 text-[8px] italic ${
                  isMine ? "text-[#38A3D8]" : "text-[#94A3B8]"
                }`}
              >
                edited
              </Text>
            )}

            <Text
              className={`text-[9px] ${
                isMine ? "text-[#38A3D8]" : "text-[#94A3B8]"
              }`}
            >
              {time}
            </Text>

            {isMine &&
              (message.read_by && message.read_by.length > 1 ? (
                <CheckCheck
                  size={14}
                  color="#0284C7"
                  strokeWidth={2.5}
                  style={{ marginLeft: 3 }}
                />
              ) : (
                <Check
                  size={14}
                  color="#94A3B8"
                  strokeWidth={2.5}
                  style={{ marginLeft: 3 }}
                />
              ))}
          </View>
        </Pressable>

        {reactions.length > 0 && (
          <View
            className={`mt-[-4px] flex-row flex-wrap ${
              isMine ? "justify-end" : "justify-start"
            }`}
          >
            {reactions.map(([emoji, users]) => {
              const reacted = !!currentUserId && users.includes(currentUserId);

              return (
                <Pressable
                  key={emoji}
                  onPress={() => onReaction(message, emoji)}
                  className={`mr-1 mt-1 flex-row items-center rounded-[11px] px-2 py-1 ${
                    reacted ? "bg-[#BAE6FD]" : "bg-white"
                  }`}
                  style={{
                    shadowColor: "#64748B",
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text className="text-[12px]">{emoji}</Text>

                  <Text
                    className={`ml-1 text-[9px] font-bold ${
                      reacted ? "text-[#0284C7]" : "text-[#475569]"
                    }`}
                  >
                    {users.length}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

export default memo(ChatMessageBubbleComponent);
