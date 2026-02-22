import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateSM2, DEFAULT_EASE } from "@/lib/leitner";

export function useRecordAnswer() {
  const { user } = useAuth();

  const recordAnswer = async (
    questionId: string,
    selectedIndex: number,
    isCorrect: boolean
  ): Promise<void> => {
    if (!user) return;

    try {
      // 1. Save attempt log
      await supabase.from("attempt_logs").insert({
        user_id: user.id,
        question_id: questionId,
        selected_index: selectedIndex,
        is_correct: isCorrect,
      });

      // 2. Get current question state
      const { data: existingState } = await supabase
        .from("user_question_state")
        .select("*")
        .eq("user_id", user.id)
        .eq("question_id", questionId)
        .maybeSingle();

      // 3. Calculate SM2 result
      const currentBox = existingState?.box_number ?? 1;
      const currentEase = existingState?.ease_factor ?? DEFAULT_EASE;
      const currentInterval = existingState?.interval_days ?? 1;

      const sm2Result = calculateSM2(
        isCorrect,
        currentBox,
        currentEase,
        currentInterval
      );

      // 4. Upsert question state
      if (existingState) {
        await supabase
          .from("user_question_state")
          .update({
            box_number: sm2Result.boxNumber,
            ease_factor: sm2Result.easeFactor,
            interval_days: sm2Result.intervalDays,
            next_review_at: sm2Result.nextReviewAt.toISOString(),
          })
          .eq("id", existingState.id);
      } else {
        await supabase.from("user_question_state").insert({
          user_id: user.id,
          question_id: questionId,
          box_number: sm2Result.boxNumber,
          ease_factor: sm2Result.easeFactor,
          interval_days: sm2Result.intervalDays,
          next_review_at: sm2Result.nextReviewAt.toISOString(),
        });
      }
    } catch (error) {
      console.error("Error recording answer:", error);
    }
  };

  return { recordAnswer, isAuthenticated: !!user };
}
