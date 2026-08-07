// src/shared/components/chat/OptimizedMessage.tsx
import { CheckCheck, Edit2, Trash2 } from "lucide-react-native";
import { memo, useState } from "react";
import { Image, Modal, Text, TouchableOpacity, View } from "react-native";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface MessageProps {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  isOwn: boolean;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  read?: boolean;
  edited?: boolean;
  deleted?: boolean;
  reactions?: Record<string, string[]>;
  onEdit?: (id: string, currentText: string) => void;
  onDelete?: (id: string) => void;
  onAddReaction?: (id: string, emoji: string) => void;
  onRemoveReaction?: (id: string, emoji: string) => void;
  currentUserId?: string;
  isDark?: boolean;
}

export const OptimizedMessage = memo(
  ({
    id,
    message,
    isOwn,
    senderName,
    senderAvatar,
    senderRole,
    created_at,
    read,
    edited,
    deleted,
    reactions,
    onEdit,
    onDelete,
    onAddReaction,
    onRemoveReaction,
    currentUserId,
    isDark = false,
  }: MessageProps) => {
    const [modalVisible, setModalVisible] = useState(false);

    const initials = senderName?.[0]?.toUpperCase() || "?";
    const timestamp = new Date(created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const handleLongPress = () => {
      if (deleted) return;
      setModalVisible(true);
    };

    const handleReactionPress = (emoji: string) => {
      setModalVisible(false);
      if (!currentUserId) return;
      const users = reactions?.[emoji] || [];
      if (users.includes(currentUserId)) {
        onRemoveReaction?.(id, emoji);
      } else {
        onAddReaction?.(id, emoji);
      }
    };

    const handleEdit = () => {
      setModalVisible(false);
      if (onEdit) onEdit(id, message);
    };

    const handleDelete = () => {
      setModalVisible(false);
      if (onDelete) onDelete(id);
    };

    // Reaction pills
    const reactionEntries = reactions
      ? Object.entries(reactions).filter(([_, users]) => users.length > 0)
      : [];
    const hasReactions = reactionEntries.length > 0;

    // Deleted message placeholder text
    const deletedText = isOwn ? "You unsent a message" : "Unsent a message";

    return (
      <>
        <TouchableOpacity
          onLongPress={handleLongPress}
          activeOpacity={deleted ? 1 : 0.7}
          className={`flex-row mb-4 gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
          disabled={deleted}
        >
          {!isOwn && (
            <View className="w-8 h-8 rounded-full bg-blue-200 items-center justify-center self-end">
              {senderAvatar ? (
                <Image
                  source={{ uri: senderAvatar }}
                  className="w-full h-full rounded-full"
                />
              ) : (
                <Text className="text-xs font-semibold text-slate-600">
                  {initials}
                </Text>
              )}
            </View>
          )}

          <View
            className={`flex-col max-w-[75%] ${isOwn ? "items-end self-end" : "items-start self-start"}`}
          >
            {!isOwn && (
              <View className="flex-row items-center gap-1 ml-1 mb-1">
                <Text
                  className={`text-xs ${isDark ? "text-slate-300" : "text-slate-500"}`}
                >
                  {senderName}
                </Text>
                {senderRole && (
                  <Text
                    className={`text-[10px] uppercase ${isDark ? "text-slate-400" : "text-slate-400"}`}
                  >
                    ({senderRole})
                  </Text>
                )}
              </View>
            )}

            <View className="relative">
              {/* Bubble */}
              <View
                className={`rounded-xl px-3 py-2 ${
                  deleted
                    ? // Deleted bubble – light gray (or dark gray in dark mode) with white text
                      isDark
                      ? "bg-gray-700 self-start"
                      : "bg-gray-200 self-start"
                    : isOwn
                      ? "bg-sky-500 self-end"
                      : isDark
                        ? "bg-slate-700 self-start"
                        : "bg-blue-100 self-start"
                }`}
              >
                {deleted ? (
                  <Text
                    className={`text-sm font-italic ${
                      isDark ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {deletedText}
                  </Text>
                ) : (
                  <>
                    <Text
                      className={`text-sm leading-relaxed ${
                        isOwn
                          ? "text-white"
                          : isDark
                            ? "text-white"
                            : "text-slate-800"
                      }`}
                    >
                      {message}
                    </Text>
                    {edited && (
                      <Text
                        className={`text-[10px] ${
                          isOwn
                            ? "text-white/60"
                            : isDark
                              ? "text-slate-400"
                              : "text-slate-400"
                        }`}
                      >
                        (edited)
                      </Text>
                    )}
                  </>
                )}
              </View>

              {/* Reaction pills – only if not deleted and has reactions */}
              {!deleted && hasReactions && (
                <View
                  className={`absolute flex-row flex-wrap gap-0.5 ${
                    isOwn
                      ? "bottom-[-6px] right-[-4px]"
                      : "bottom-[-6px] left-[-4px]"
                  }`}
                >
                  {reactionEntries.map(([emoji, users]) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => handleReactionPress(emoji)}
                      className={`flex-row items-center rounded-full px-1.5 py-0.8 border ${
                        users.includes(currentUserId || "")
                          ? "border-sky-400"
                          : isDark
                            ? "border-slate-600"
                            : "border-slate-200"
                      } ${isDark ? "bg-slate-800" : "bg-white"}`}
                      style={{ elevation: 1 }}
                    >
                      <Text className="text-xs mr-0.5">{emoji}</Text>
                      <Text
                        className={`text-[9px] ${isDark ? "text-slate-300" : "text-slate-500"}`}
                      >
                        {users.length}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Footer: timestamp + read receipt (only if not deleted) */}
            <View className="flex-row items-center gap-1 mt-1 px-1">
              <Text
                className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-400"}`}
              >
                {timestamp}
              </Text>
              {isOwn && !deleted && read && (
                <CheckCheck size={14} color="#0ea5e9" />
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* ─── Modal – only for non‑deleted messages ──────────────── */}
        {!deleted && (
          <Modal
            transparent
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
            animationType="slide"
          >
            <TouchableOpacity
              className="flex-1 bg-black/40 justify-end"
              activeOpacity={1}
              onPress={() => setModalVisible(false)}
            >
              <View
                className={`rounded-t-3xl px-4 pb-8 pt-2 ${isDark ? "bg-slate-800" : "bg-white"}`}
              >
                <View
                  className={`w-12 h-1 rounded-full self-center mb-3 ${isDark ? "bg-slate-600" : "bg-slate-300"}`}
                />

                {/* Emoji row */}
                <View className="flex-row justify-around py-2">
                  {EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => handleReactionPress(emoji)}
                      className="p-2"
                    >
                      <Text className="text-3xl">{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Actions (only for own messages) */}
                {isOwn && (
                  <>
                    <TouchableOpacity
                      className={`flex-row items-center py-3 px-2 ${isDark ? "border-slate-700" : "border-slate-100"} border-t`}
                      onPress={handleEdit}
                    >
                      <Edit2 size={20} color="#0ea5e9" />
                      <Text
                        className={`ml-4 text-base ${isDark ? "text-slate-200" : "text-slate-700"}`}
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-row items-center py-3 px-2"
                      onPress={handleDelete}
                    >
                      <Trash2 size={20} color="#ef4444" />
                      <Text className="ml-4 text-red-500 text-base">
                        Unsend
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  className={`mt-2 pt-3 items-center ${isDark ? "border-slate-700" : "border-slate-100"} border-t`}
                  onPress={() => setModalVisible(false)}
                >
                  <Text
                    className={`text-base font-semibold ${isDark ? "text-slate-400" : "text-slate-400"}`}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </>
    );
  },
  (prev, next) =>
    prev.id === next.id &&
    prev.message === next.message &&
    prev.isOwn === next.isOwn &&
    prev.read === next.read &&
    prev.edited === next.edited &&
    prev.deleted === next.deleted &&
    prev.reactions === next.reactions &&
    prev.senderRole === next.senderRole &&
    prev.isDark === next.isDark,
);
