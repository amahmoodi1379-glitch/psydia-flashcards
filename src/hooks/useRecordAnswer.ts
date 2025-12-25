import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// SM2 Algorithm constants
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

interface SM2Result {
  boxNumber: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: Date;
}

function calculateSM2(
  correct: boolean,
  currentBox: number,
  currentEase: number,
  currentInterval: number
): SM2Result {
  let newBox = currentBox;
  let newEase = currentEase;
  let newInterval = currentInterval;

  if (correct) {
    // Move to next box
    newBox = Math.min(currentBox + 1, 7);
    
    // Increase ease factor
    newEase = currentEase + 0.1;
    
    // Calculate new interval based on box number
    if (newBox === 1) {
      newInterval = 1;
    } else if (newBox === 2) {
      newInterval = 3;
    } else {
      newInterval = Math.round(currentInterval * newEase);
    }
  } else {
    // Wrong answer: go back to box 1
    newBox = 1;
    newInterval = 1;
    
    // Decrease ease factor but keep above minimum
    newEase = Math.max(MIN_EASE, currentEase - 0.2);
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    boxNumber: newBox,
    easeFactor: newEase,
    intervalDays: newInterval,
    nextReviewAt,
  };
}

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
      
      const sm2Result = calculateSM2(isCorrect, currentBox, currentEase, currentInterval);

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
