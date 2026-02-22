import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { recordAnswerWithRpc, RecordAnswerError } from "@/lib/recordAnswer";

interface RecordAnswerOptions {
  clientRequestId?: string;
}

export { RecordAnswerError };

export function useRecordAnswer() {
  const { user } = useAuth();

  const recordAnswer = async (
    questionId: string,
    selectedIndex: number,
    isCorrect: boolean,
    options?: RecordAnswerOptions
  ): Promise<void> => {
    if (!user) {
      throw new RecordAnswerError("برای ثبت پاسخ باید وارد حساب شوید.");
    }

    await recordAnswerWithRpc(supabase, {
      userId: user.id,
      questionId,
      selectedIndex,
      isCorrect,
      clientRequestId: options?.clientRequestId,
    });
  };

  return { recordAnswer, isAuthenticated: !!user };
}
