import { CheckCheck, Edit2, Trash2 } from "lucide-react-native";
import { memo, useCallback, useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

type ReactionMap = Record<string, string[]>;

interface MessageProps {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;

  // Optional pre-formatted timestamp from chat.tsx
  formattedTime?: string;

  isOwn: boolean;

  senderName: string;
  senderAvatar?: string;
  senderRole?: string;

  read?: boolean;
  edited?: boolean;
  deleted?: boolean;

  reactions?: ReactionMap;

  onEdit?: (id: string, currentText: string) => void;
  onDelete?: (id: string) => void;

  onAddReaction?: (id: string, emoji: string) => void | Promise<void>;
  onRemoveReaction?: (id: string, emoji: string) => void | Promise<void>;

  currentUserId?: string;

  isDark?: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "#7C3AED",
  dispatcher: "#0284C7",
  driver: "#16A34A",
  staff: "#64748B",
};

const formatPhilippineTime = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleTimeString("en-PH", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
};

export const OptimizedMessage = memo(
  function OptimizedMessage({
    id,
    message,
    isOwn,
    senderName,
    senderAvatar,
    senderRole,
    created_at,
    formattedTime,
    read,
    edited,
    deleted,
    reactions = {},
    onEdit,
    onDelete,
    onAddReaction,
    onRemoveReaction,
    currentUserId,
    isDark = false,
  }: MessageProps) {
    const [actionsOpen, setActionsOpen] = useState(false);
    const [reactionBusy, setReactionBusy] = useState(false);

    const initials = senderName?.trim()?.charAt(0)?.toUpperCase() || "?";

    const roleKey = senderRole?.toLowerCase() || "staff";

    const roleColor = ROLE_COLORS[roleKey] || ROLE_COLORS.staff;

    const timestamp = useMemo(
      () => formattedTime || formatPhilippineTime(created_at),
      [formattedTime, created_at],
    );

    const reactionEntries = useMemo(
      () =>
        Object.entries(reactions).filter(
          ([, users]) => Array.isArray(users) && users.length > 0,
        ),
      [reactions],
    );

    const currentReaction = useMemo(() => {
      if (!currentUserId) return null;

      for (const [emoji, users] of reactionEntries) {
        if (users.includes(currentUserId)) {
          return emoji;
        }
      }

      return null;
    }, [currentUserId, reactionEntries]);

    const handleLongPress = useCallback(() => {
      if (deleted) return;

      setActionsOpen((previous) => !previous);
    }, [deleted]);

    const handleCloseActions = useCallback(() => {
      setActionsOpen(false);
    }, []);

    const handleReaction = useCallback(
      async (emoji: string) => {
        if (!currentUserId || reactionBusy || deleted) {
          return;
        }

        setReactionBusy(true);

        try {
          if (currentReaction === emoji) {
            await onRemoveReaction?.(id, emoji);
            return;
          }

          if (currentReaction) {
            await onRemoveReaction?.(id, currentReaction);
          }

          await onAddReaction?.(id, emoji);
        } catch (error) {
          console.error("Reaction error:", error);
        } finally {
          setReactionBusy(false);
          setActionsOpen(false);
        }
      },
      [
        currentUserId,
        reactionBusy,
        deleted,
        currentReaction,
        onRemoveReaction,
        onAddReaction,
        id,
      ],
    );

    const handleEdit = useCallback(() => {
      setActionsOpen(false);
      onEdit?.(id, message);
    }, [id, message, onEdit]);

    const handleDelete = useCallback(() => {
      setActionsOpen(false);
      onDelete?.(id);
    }, [id, onDelete]);

    const deletedText = isOwn ? "You unsent a message" : "Unsent a message";

    return (
      <View className={`mb-3 px-1 ${isOwn ? "items-end" : "items-start"}`}>
        <View
          className={`flex-row max-w-[86%] ${
            isOwn ? "justify-end" : "justify-start"
          }`}
        >
          {!isOwn && (
            <View
              className="mr-2 self-end h-9 w-9 items-center justify-center rounded-[14px]"
              style={{
                backgroundColor: isDark ? "#164E63" : "#BAE6FD",

                shadowColor: "#38BDF8",
                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                shadowOpacity: 0.16,
                shadowRadius: 5,
                elevation: 3,
              }}
            >
              {senderAvatar ? (
                <Image
                  source={{
                    uri: senderAvatar,
                  }}
                  className="h-full w-full rounded-[14px]"
                />
              ) : (
                <Text
                  className={`text-xs font-extrabold ${
                    isDark ? "text-sky-300" : "text-sky-700"
                  }`}
                >
                  {initials}
                </Text>
              )}
            </View>
          )}

          <View
            className={`max-w-[82%] ${isOwn ? "items-end" : "items-start"}`}
          >
            {!isOwn && (
              <View className="mb-1 ml-1 flex-row items-center">
                <Text
                  className={`text-[11px] font-extrabold ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
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
                    {roleKey.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}

            <View className="relative">
              <Pressable
                onLongPress={handleLongPress}
                delayLongPress={280}
                onPress={() => {
                  if (actionsOpen) {
                    setActionsOpen(false);
                  }
                }}
                disabled={deleted}
                className={`rounded-[19px] px-3.5 pb-2 pt-2.5 ${
                  deleted
                    ? isDark
                      ? "bg-slate-700"
                      : "bg-slate-200"
                    : isOwn
                      ? "bg-sky-500"
                      : isDark
                        ? "bg-slate-700"
                        : "bg-white"
                }`}
                style={{
                  borderBottomLeftRadius: !isOwn && !deleted ? 6 : 19,

                  borderBottomRightRadius: isOwn && !deleted ? 6 : 19,

                  shadowColor: isOwn ? "#0284C7" : "#7DD3FC",

                  shadowOffset: {
                    width: 0,
                    height: 3,
                  },

                  shadowOpacity: deleted ? 0.04 : 0.11,

                  shadowRadius: 7,
                  elevation: 3,
                }}
              >
                {deleted ? (
                  <Text
                    className={`text-sm italic ${
                      isDark ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {deletedText}
                  </Text>
                ) : (
                  <>
                    <Text
                      className={`text-[14px] leading-[20px] ${
                        isOwn
                          ? "text-white"
                          : isDark
                            ? "text-white"
                            : "text-slate-800"
                      }`}
                    >
                      {message}
                    </Text>

                    <View className="mt-1.5 flex-row items-center justify-end">
                      {edited && (
                        <Text
                          className={`mr-1 text-[8px] italic ${
                            isOwn ? "text-white/60" : "text-slate-400"
                          }`}
                        >
                          edited
                        </Text>
                      )}

                      <Text
                        className={`text-[9px] ${
                          isOwn ? "text-sky-100" : "text-slate-400"
                        }`}
                      >
                        {timestamp}
                      </Text>

                      {isOwn && (
                        <View className="ml-1">
                          <CheckCheck
                            size={13}
                            color={read ? "#0369A1" : "#BAE6FD"}
                          />
                        </View>
                      )}
                    </View>
                  </>
                )}
              </Pressable>

              {!deleted && reactionEntries.length > 0 && (
                <View
                  className={`absolute -bottom-2 flex-row flex-wrap ${
                    isOwn ? "right-1" : "left-1"
                  }`}
                >
                  {reactionEntries.map(([emoji, users]) => {
                    const reacted =
                      !!currentUserId && users.includes(currentUserId);

                    return (
                      <Pressable
                        key={emoji}
                        disabled={reactionBusy}
                        onPress={() => handleReaction(emoji)}
                        className={`mr-1 mb-1 flex-row items-center rounded-full border px-2 py-0.5 ${
                          reacted
                            ? "border-sky-400 bg-sky-100"
                            : isDark
                              ? "border-slate-600 bg-slate-800"
                              : "border-white bg-white"
                        }`}
                        style={{
                          shadowColor: "#64748B",
                          shadowOffset: {
                            width: 0,
                            height: 2,
                          },
                          shadowOpacity: 0.12,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                      >
                        <Text className="text-[12px]">{emoji}</Text>

                        <Text
                          className={`ml-0.5 text-[9px] font-bold ${
                            reacted
                              ? "text-sky-700"
                              : isDark
                                ? "text-slate-300"
                                : "text-slate-500"
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

            {actionsOpen && !deleted && (
              <View
                className={`mt-2 rounded-[20px] p-2 ${
                  isOwn ? "self-end" : "self-start"
                } ${isDark ? "bg-slate-800" : "bg-white"}`}
                style={{
                  minWidth: 225,

                  shadowColor: "#0EA5E9",
                  shadowOffset: {
                    width: 0,
                    height: 6,
                  },
                  shadowOpacity: 0.18,
                  shadowRadius: 14,
                  elevation: 8,
                }}
              >
                <View
                  className={`mb-1 flex-row items-center justify-between rounded-[15px] px-1.5 py-1 ${
                    isDark ? "bg-slate-700" : "bg-sky-50"
                  }`}
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      disabled={reactionBusy}
                      onPress={() => handleReaction(emoji)}
                      className={`h-10 w-10 items-center justify-center rounded-[13px] ${
                        currentReaction === emoji ? "bg-sky-200" : ""
                      }`}
                    >
                      <Text className="text-[22px]">{emoji}</Text>
                    </Pressable>
                  ))}
                </View>

                {isOwn && (
                  <>
                    <Pressable
                      onPress={handleEdit}
                      className={`mt-1 flex-row items-center rounded-[14px] px-3 py-2.5 ${
                        isDark ? "bg-slate-700" : "bg-sky-50"
                      }`}
                    >
                      <Edit2 size={18} color="#0284C7" />

                      <Text
                        className={`ml-3 text-[13px] font-bold ${
                          isDark ? "text-slate-200" : "text-slate-700"
                        }`}
                      >
                        Edit message
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleDelete}
                      className={`mt-1 flex-row items-center rounded-[14px] px-3 py-2.5 ${
                        isDark ? "bg-red-950" : "bg-red-50"
                      }`}
                    >
                      <Trash2 size={18} color="#EF4444" />

                      <Text className="ml-3 text-[13px] font-bold text-red-500">
                        Unsend message
                      </Text>
                    </Pressable>
                  </>
                )}

                <Pressable
                  onPress={handleCloseActions}
                  className="mt-1 items-center rounded-[14px] py-2"
                >
                  <Text className="text-[12px] font-bold text-slate-400">
                    Tap message to close
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  },
  (previous, next) =>
    previous.id === next.id &&
    previous.message === next.message &&
    previous.created_at === next.created_at &&
    previous.formattedTime === next.formattedTime &&
    previous.isOwn === next.isOwn &&
    previous.read === next.read &&
    previous.edited === next.edited &&
    previous.deleted === next.deleted &&
    previous.reactions === next.reactions &&
    previous.senderName === next.senderName &&
    previous.senderAvatar === next.senderAvatar &&
    previous.senderRole === next.senderRole &&
    previous.currentUserId === next.currentUserId &&
    previous.isDark === next.isDark,
);
