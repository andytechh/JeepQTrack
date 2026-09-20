import { supabase } from "../config/supabase";

export interface SUSAnswers {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  q10: number;
}

export interface SUSFeedbackRecord {
  id: string;
  user_id: string;
  role: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  q10: number;
  sus_score: number;
  created_at: string;
}

export const SUSFeedbackService = {
  async hasSubmitted(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("sus_feedback")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("SUS submission check failed:", error);
      throw error;
    }

    return !!data;
  },

  async submit(
    userId: string,
    role: string,
    answers: SUSAnswers,
  ): Promise<SUSFeedbackRecord> {
    const { data, error } = await supabase
      .from("sus_feedback")
      .insert({
        user_id: userId,
        role,
        q1: answers.q1,
        q2: answers.q2,
        q3: answers.q3,
        q4: answers.q4,
        q5: answers.q5,
        q6: answers.q6,
        q7: answers.q7,
        q8: answers.q8,
        q9: answers.q9,
        q10: answers.q10,
        sus_score: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("SUS submission failed:", error);
      throw error;
    }

    return data as SUSFeedbackRecord;
  },
};
