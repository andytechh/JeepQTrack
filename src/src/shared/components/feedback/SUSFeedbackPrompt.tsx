import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSUSFeedback } from "../../hooks/useSUSFeedback";
import SUSFeedbackModal from "./SUSFeedbackModal";

interface SUSFeedbackPromptProps {
  userId?: string;
  role?: string;
  enabled?: boolean;
}

export default function SUSFeedbackPrompt({
  userId,
  role,
  enabled = true,
}: SUSFeedbackPromptProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { isChecking, hasSubmitted, isSubmitting, submitFeedback } =
    useSUSFeedback({
      userId,
      role,
      enabled,
    });

  useEffect(() => {
    setModalVisible(false);
    setDismissed(false);
  }, [userId]);

  const shouldShowPrompt =
    enabled &&
    Boolean(userId) &&
    Boolean(role) &&
    !isChecking &&
    !hasSubmitted &&
    !dismissed;

  const handleOpen = () => {
    if (isSubmitting) {
      return;
    }

    setModalVisible(true);
  };

  const handleDismiss = () => {
    if (isSubmitting) {
      return;
    }

    setModalVisible(false);
    setDismissed(true);
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    setModalVisible(false);
    setDismissed(true);
  };

  return (
    <>
      {shouldShowPrompt ? (
        <View pointerEvents="box-none" className="absolute inset-0 z-[9999]">
          <View
            pointerEvents="box-none"
            className="absolute bottom-0 left-0 right-0 px-4 pb-5"
          >
            <View className="rounded-[26px] border border-[#C4E4EF] bg-[#EAF9FE] p-[18px] shadow-2xl">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss feedback"
                accessibilityState={{ disabled: isSubmitting }}
                disabled={isSubmitting}
                onPress={handleDismiss}
                className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-[#D5EEF7]"
              >
                <Text className="text-[22px] font-semibold leading-5 text-[#477386]">
                  ×
                </Text>
              </Pressable>

              <View className="pr-10">
                <Text className="text-[17px] font-extrabold text-[#17445A]">
                  Help improve SmartQs
                </Text>

                <Text className="mt-1 text-[12px] leading-[18px] text-[#477386]">
                  Share your experience with a short usability questionnaire.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Give feedback"
                  accessibilityState={{ disabled: isSubmitting }}
                  disabled={isSubmitting}
                  onPress={handleOpen}
                  className="mt-3 h-10 self-start items-center justify-center rounded-[14px] bg-[#43B9E8] px-5 shadow-md"
                >
                  <Text className="text-[12px] font-extrabold text-white">
                    Give Feedback
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <SUSFeedbackModal
        visible={modalVisible}
        submitting={isSubmitting}
        onClose={handleClose}
        onSubmit={async (answers) => {
          await submitFeedback(answers);
        }}
      />
    </>
  );
}
