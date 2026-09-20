import { useCallback, useEffect, useState } from "react";
import { SUSAnswers, SUSFeedbackService } from "../services/SUSFeedbackService";

interface UseSUSFeedbackProps {
  userId?: string;
  role?: string;
  enabled?: boolean;
}

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

export function useSUSFeedback({
  userId,
  role,
  enabled = true,
}: UseSUSFeedbackProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSubmission = useCallback(async () => {
    if (!enabled || !userId) {
      setIsChecking(false);
      setHasSubmitted(false);
      setError(null);
      return;
    }

    setIsChecking(true);
    setHasSubmitted(false);
    setError(null);

    try {
      const submitted = await SUSFeedbackService.hasSubmitted(userId);

      setHasSubmitted(submitted);
    } catch (error) {
      console.error("SUS status check failed:", error);
      setHasSubmitted(false);
      setError("Unable to check feedback status.");
    } finally {
      setIsChecking(false);
    }
  }, [enabled, userId]);

  useEffect(() => {
    void checkSubmission();
  }, [checkSubmission]);

  const submitFeedback = useCallback(
    async (answers: SUSAnswers) => {
      if (!userId || !role) {
        throw new Error("User information is missing.");
      }

      try {
        setIsSubmitting(true);
        setError(null);

        const result = await SUSFeedbackService.submit(userId, role, answers);

        setHasSubmitted(true);

        return result;
      } catch (error: unknown) {
        console.error("SUS submission failed:", error);

        const supabaseError = error as SupabaseErrorLike;

        if (supabaseError?.code === "23505") {
          setHasSubmitted(true);
          setError("You have already submitted your feedback.");
        } else {
          setError(
            supabaseError?.message ||
              "Failed to submit feedback. Please try again.",
          );
        }

        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId, role],
  );

  return {
    isChecking,
    hasSubmitted,
    isSubmitting,
    error,
    submitFeedback,
    refresh: checkSubmission,
  };
}
