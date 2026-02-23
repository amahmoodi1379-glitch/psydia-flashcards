import { useState, useEffect } from "react";
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

export function useLeitnerReview(limit: number = 20): LeitnerReviewResult {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<LeitnerQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setQuestions([]);
      setIsLoading(false);
      return;
    }

    let active = true;

    async function fetchQuestions() {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          "get_leitner_review_questions",
          { _limit: limit }
        );

        if (!active) return;
        if (rpcError) throw rpcError;

        const rows = (data ?? []) as Array<{
          id: string;
          stem_text: string;
          choices: unknown;
          subtopic_id: string;
        }>;

        const parsed: LeitnerQuestion[] = rows.map((q) => ({
          id: q.id,
          stem_text: q.stem_text,
          subtopic_id: q.subtopic_id,
          choices: Array.isArray(q.choices)
            ? (q.choices as string[])
            : JSON.parse(q.choices as string),
        }));

        setQuestions(parsed);
      } catch (err) {
        if (!active) return;
        console.error("Error fetching leitner review questions:", err);
        setError("خطا در بارگذاری سوالات لایتنر");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchQuestions();

    return () => {
      active = false;
    };
  }, [user, limit]);

  return { questions, isLoading, error };
}
