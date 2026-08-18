import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

interface ChatEditModalProps {
  visible: boolean;
  initialText: string;
  onClose: () => void;
  onSave: (text: string) => void | Promise<void>;
}

export default function ChatEditModal({
  visible,
  initialText,
  onClose,
  onSave,
}: ChatEditModalProps) {
  const [value, setValue] = useState(initialText);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(initialText);
    }
  }, [visible, initialText]);

  const handleSave = async () => {
    const trimmed = value.trim();

    if (!trimmed || saving) {
      return;
    }

    try {
      setSaving(true);
      await onSave(trimmed);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 items-center justify-center bg-black/30 px-5"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          className="w-full max-w-[390px] rounded-[28px] bg-[#F8FCFF] p-5"
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
                Edit message
              </Text>

              <Text className="mt-1 text-[11px] text-[#94A3B8]">
                Update your message
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-[13px] bg-[#E0F2FE]"
            >
              <X size={18} color="#475569" />
            </Pressable>
          </View>

          <View
            className="rounded-[20px] bg-white px-4 py-2"
            style={{
              shadowColor: "#7DD3FC",
              shadowOffset: {
                width: 0,
                height: 3,
              },
              shadowOpacity: 0.1,
              shadowRadius: 7,
              elevation: 2,
            }}
          >
            <TextInput
              value={value}
              onChangeText={setValue}
              multiline
              autoFocus
              maxLength={2000}
              placeholder="Edit message..."
              placeholderTextColor="#94A3B8"
              className="min-h-[90px] text-[14px] text-[#0F172A]"
              textAlignVertical="top"
            />
          </View>

          <View className="mt-4 flex-row justify-end">
            <Pressable
              onPress={onClose}
              className="mr-2 rounded-[15px] bg-[#E2E8F0] px-5 py-3"
            >
              <Text className="text-[12px] font-bold text-[#475569]">
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={!value.trim() || saving}
              onPress={handleSave}
              className="rounded-[15px] bg-[#0284C7] px-5 py-3"
              style={{
                opacity: !value.trim() || saving ? 0.5 : 1,
                shadowColor: "#0284C7",
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Text className="text-[12px] font-extrabold text-white">
                {saving ? "Saving..." : "Save"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
