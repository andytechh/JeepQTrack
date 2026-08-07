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
  reactions?: Record<string, string[]>; // emoji -> user IDs
  onEdit?: (id: string, currentText: string) => void;
  onDelete?: (id: string) => void;
  onAddReaction?: (id: string, emoji: string) => void;
  onRemoveReaction?: (id: string, emoji: string) => void;
  currentUserId?: string;
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

    // Deleted placeholder
    if (deleted) {
      return (
        <View
          className={`flex-row mb-4 ${isOwn ? "justify-end" : "justify-start"}`}
        >
          <View className="bg-slate-100 rounded-xl px-3 py-2">
            <Text className="text-slate-400 italic text-sm">
              Message unsent
            </Text>
          </View>
        </View>
      );
    }

    // Reaction pills
    const reactionEntries = reactions
      ? Object.entries(reactions).filter(([_, users]) => users.length > 0)
      : [];
    const hasReactions = reactionEntries.length > 0;

    return (
      <>
        <TouchableOpacity
          onLongPress={handleLongPress}
          activeOpacity={0.7}
          className={`flex-row mb-4 gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
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
                <Text className="text-xs text-slate-500">{senderName}</Text>
                {senderRole && (
                  <Text className="text-[10px] text-slate-400 uppercase">
                    ({senderRole})
                  </Text>
                )}
              </View>
            )}

            {/* Message bubble + reactions container */}
            <View className="relative">
              {/* Bubble */}
              <View
                className={`rounded-xl px-3 py-2 ${
                  isOwn ? "bg-sky-500 self-end" : "bg-blue-100 self-start"
                }`}
              >
                <Text
                  className={`text-sm leading-relaxed ${isOwn ? "text-white" : "text-slate-800"}`}
                >
                  {message}
                </Text>
                {edited && (
                  <Text
                    className={`text-[10px] ${isOwn ? "text-white/60" : "text-slate-400"}`}
                  >
                    (edited)
                  </Text>
                )}
              </View>

              {/* Reaction pills – overlapping the bubble */}
              {hasReactions && (
                <View
                  className={`absolute flex-row flex-wrap gap-0.8 ${
                    isOwn
                      ? "bottom-[-6px] right-[-4px]"
                      : "bottom-[-6px] left-[-4px]"
                  }`}
                >
                  {reactionEntries.map(([emoji, users]) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => handleReactionPress(emoji)}
                      className={`flex-row items-center bg-white rounded-full px-1.5 py-0.8 border ${
                        users.includes(currentUserId || "")
                          ? "border-sky-400"
                          : "border-slate-200"
                      } shadow-sm`}
                      style={{ elevation: 1 }}
                    >
                      <Text className="text-xs mr-0.5">{emoji}</Text>
                      <Text className="text-[9px] text-slate-500">
                        {users.length}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Footer: timestamp + read receipt */}
            <View className="flex-row items-center gap-1 mt-1 px-1">
              <Text className="text-[10px] text-slate-400">{timestamp}</Text>
              {isOwn && read && <CheckCheck size={14} color="#0ea5e9" />}
            </View>
          </View>
        </TouchableOpacity>

        {/* ─── Modal: reaction picker + actions ───────────────────── */}
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
            <View className="bg-white rounded-t-3xl px-6 pb-8 pt-2 ">
              <View className="w-12 h-1 bg-slate-300 rounded-full self-center mb-3" />

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
                    className="flex-row items-center py-3 px-2 border-t border-slate-100"
                    onPress={handleEdit}
                  >
                    <Edit2 size={20} color="#0ea5e9" />
                    <Text className="ml-4 text-slate-700 text-base">Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center py-3 px-2"
                    onPress={handleDelete}
                  >
                    <Trash2 size={20} color="#ef4444" />
                    <Text className="ml-4 text-red-500 text-base">Unsend</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                className="mt-2 pt-3 items-center border-t border-slate-100"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-slate-400 text-base font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
    prev.senderRole === next.senderRole,
);
