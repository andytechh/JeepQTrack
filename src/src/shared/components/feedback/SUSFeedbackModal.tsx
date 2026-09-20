import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { SUSAnswers } from "../../services/SUSFeedbackService";
import { SUS_QUESTIONS } from "./susQuestions";

interface SUSFeedbackModalProps {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (answers: SUSAnswers) => Promise<void>;
}

export default function SUSFeedbackModal({
  visible,
  submitting,
  onClose,
  onSubmit,
}: SUSFeedbackModalProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const successCircleScale = useRef(new Animated.Value(0)).current;
  const successCircleOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(18)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const messageTranslateY = useRef(new Animated.Value(15)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(15)).current;

  const question = SUS_QUESTIONS[questionIndex];

  const currentAnswer = answers[question.number];

  const progress = useMemo(
    () => ((questionIndex + 1) / SUS_QUESTIONS.length) * 100,
    [questionIndex],
  );

  useEffect(() => {
    if (!showSuccess) {
      return;
    }

    successCircleScale.setValue(0.25);
    successCircleOpacity.setValue(0);
    checkScale.setValue(0.2);
    checkOpacity.setValue(0);
    titleOpacity.setValue(0);
    titleTranslateY.setValue(18);
    messageOpacity.setValue(0);
    messageTranslateY.setValue(15);
    buttonOpacity.setValue(0);
    buttonTranslateY.setValue(15);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(successCircleScale, {
          toValue: 1,
          friction: 5,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(successCircleOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(messageTranslateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTranslateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    showSuccess,
    successCircleScale,
    successCircleOpacity,
    checkScale,
    checkOpacity,
    titleOpacity,
    titleTranslateY,
    messageOpacity,
    messageTranslateY,
    buttonOpacity,
    buttonTranslateY,
  ]);

  const selectAnswer = (value: number) => {
    setAnswers((previous) => ({
      ...previous,
      [question.number]: value,
    }));
  };

  const handleNext = async () => {
    if (!currentAnswer || submitting) {
      return;
    }

    if (questionIndex < SUS_QUESTIONS.length - 1) {
      setQuestionIndex((previous) => previous + 1);
      return;
    }

    const completeAnswers: SUSAnswers = {
      q1: answers[1],
      q2: answers[2],
      q3: answers[3],
      q4: answers[4],
      q5: answers[5],
      q6: answers[6],
      q7: answers[7],
      q8: answers[8],
      q9: answers[9],
      q10: answers[10],
    };

    try {
      await onSubmit(completeAnswers);
      setShowSuccess(true);
    } catch {
      return;
    }
  };

  const handleBack = () => {
    if (submitting) {
      return;
    }

    setQuestionIndex((previous) => Math.max(previous - 1, 0));
  };

  const handleClose = () => {
    if (submitting) {
      return;
    }

    setQuestionIndex(0);
    setAnswers({});
    setShowSuccess(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-[#17445A]/45 px-5">
        <View className="w-full max-w-[500px] rounded-[28px] border border-[#C4E4EF] bg-[#EAF9FE] p-[22px] shadow-2xl">
          {showSuccess ? (
            <View className="items-center px-3 py-8">
              <Animated.View
                style={{
                  opacity: successCircleOpacity,
                  transform: [{ scale: successCircleScale }],
                }}
                className="h-[96px] w-[96px] items-center justify-center rounded-full border-[6px] border-[#D5EEF7] bg-[#43B9E8]"
              >
                <Animated.View
                  style={{
                    opacity: checkOpacity,
                    transform: [{ scale: checkScale }],
                  }}
                  className="h-[70px] w-[70px] items-center justify-center rounded-full bg-[#43B9E8]"
                >
                  <Text className="text-[46px] font-extrabold leading-[52px] text-white">
                    ✓
                  </Text>
                </Animated.View>
              </Animated.View>

              <Animated.View
                style={{
                  opacity: titleOpacity,
                  transform: [{ translateY: titleTranslateY }],
                }}
              >
                <Text className="mt-6 text-center text-[26px] font-extrabold text-[#17445A]">
                  Thank You!
                </Text>
              </Animated.View>

              <Animated.View
                style={{
                  opacity: messageOpacity,
                  transform: [{ translateY: messageTranslateY }],
                }}
              >
                <Text className="mt-2 text-center text-[15px] font-bold text-[#477386]">
                  Your feedback has been submitted successfully.
                </Text>

                <Text className="mt-3 px-3 text-center text-[13px] leading-[20px] text-[#7FA2B1]">
                  Thank you for taking the time to share your experience with
                  SmartQs. Your feedback helps us improve the system for
                  everyone.
                </Text>

                <View className="mt-5 rounded-[18px] border border-[#C4E4EF] bg-[#F4FCFF] px-4 py-3">
                  <Text className="text-center text-[12px] font-semibold leading-[18px] text-[#477386]">
                    Your response has been recorded.
                  </Text>
                </View>
              </Animated.View>

              <Animated.View
                style={{
                  opacity: buttonOpacity,
                  transform: [{ translateY: buttonTranslateY }],
                }}
                className="w-full"
              >
                <Pressable
                  className="mt-6 h-[50px] w-full items-center justify-center rounded-[18px] bg-[#43B9E8] shadow-md"
                  onPress={handleClose}
                >
                  <Text className="text-[15px] font-extrabold text-white">
                    Done
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          ) : (
            <>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-[21px] font-extrabold text-[#17445A]">
                    SmartQs Feedback
                  </Text>

                  <Text className="mt-[3px] text-[13px] text-[#477386]">
                    System Usability Scale
                  </Text>
                </View>

                <Pressable
                  onPress={handleClose}
                  disabled={submitting}
                  className="h-[38px] w-[38px] items-center justify-center rounded-full bg-[#D5EEF7]"
                >
                  <Text className="text-[25px] leading-[27px] text-[#477386]">
                    ×
                  </Text>
                </Pressable>
              </View>

              <View className="mt-[22px]">
                <View className="h-[7px] overflow-hidden rounded-full bg-[#D5EEF7]">
                  <View
                    className="h-full rounded-full bg-[#43B9E8]"
                    style={{ width: `${progress}%` }}
                  />
                </View>

                <Text className="mt-2 text-[12px] font-semibold text-[#7FA2B1]">
                  Question {questionIndex + 1} of {SUS_QUESTIONS.length}
                </Text>
              </View>

              <View className="mt-5 rounded-[22px] border border-[#C4E4EF] bg-[#F4FCFF] p-5">
                <Text className="mb-2.5 text-[13px] font-extrabold text-[#43B9E8]">
                  QUESTION {question.number}
                </Text>

                <Text className="text-[18px] font-bold leading-[27px] text-[#17445A]">
                  {question.text}
                </Text>
              </View>

              <Text className="mt-5 text-center text-[13px] font-semibold text-[#477386]">
                Select one answer
              </Text>

              <View className="mt-3.5 flex-row justify-between">
                {[1, 2, 3, 4, 5].map((value) => {
                  const selected = currentAnswer === value;

                  return (
                    <Pressable
                      key={value}
                      onPress={() => selectAnswer(value)}
                      className={`h-[50px] w-[50px] items-center justify-center rounded-full border-2 ${
                        selected
                          ? "border-[#167BAA] bg-[#43B9E8]"
                          : "border-[#C4E4EF] bg-[#F4FCFF]"
                      }`}
                    >
                      <Text
                        className={`text-[16px] font-extrabold ${
                          selected ? "text-white" : "text-[#477386]"
                        }`}
                      >
                        {value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="mt-2 flex-row justify-between">
                <Text className="text-left text-[10px] leading-[13px] text-[#7FA2B1]">
                  Strongly{"\n"}Disagree
                </Text>

                <Text className="text-right text-[10px] leading-[13px] text-[#7FA2B1]">
                  Strongly{"\n"}Agree
                </Text>
              </View>

              <View className="mt-6 flex-row gap-3">
                {questionIndex > 0 ? (
                  <Pressable
                    className="h-[50px] flex-1 items-center justify-center rounded-[18px] bg-[#D5EEF7]"
                    onPress={handleBack}
                    disabled={submitting}
                  >
                    <Text className="text-[15px] font-extrabold text-[#167BAA]">
                      Back
                    </Text>
                  </Pressable>
                ) : (
                  <View className="flex-1" />
                )}

                <Pressable
                  className={`h-[50px] flex-1 items-center justify-center rounded-[18px] bg-[#43B9E8] ${
                    !currentAnswer || submitting ? "opacity-40" : ""
                  }`}
                  onPress={handleNext}
                  disabled={!currentAnswer || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-[15px] font-extrabold text-white">
                      {questionIndex === SUS_QUESTIONS.length - 1
                        ? "Submit"
                        : "Next"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
