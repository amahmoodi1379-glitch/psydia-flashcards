import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LeitnerQuestion {
  id: string;
  stem_text: string;
  choices: string[];
  subtopic_id: string;
}

interface LeitnerReviewResult {
  questions: LeitnerQuestion[];
  isLoading: boolean;
  error: string | null;
}

async function fetchLeitnerReviewQuestions(limit: number): Promise<LeitnerQuestion[]> {
  const { data, error } = await supabase.rpc(
    "get_leitner_review_questions",
    { _limit: limit }
  );

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    stem_text: string;
    choices: unknown;
    subtopic_id: string;
  }>).map((q) => ({
    id: q.id,
    stem_text: q.stem_text,
    subtopic_id: q.subtopic_id,
    choices: Array.isArray(q.choices)
      ? (q.choices as string[])
      : JSON.parse(q.choices as string),
  }));
}

export function useLeitnerReview(limit: number = 20): LeitnerReviewResult {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["leitner-review", user?.id, limit],
    queryFn: () => fetchLeitnerReviewQuestions(limit),
    enabled: !!user,
    staleTime: 0, // Always fetch fresh review questions
  });

  return {
    questions: data ?? [],
    isLoading,
    error: error ? "خطا در بارگذاری سوالات لایتنر" : null,
  };
}
