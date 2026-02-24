import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Question {
  id: string;
  stem_text: string;
  choices: string[];
  subtopic_id: string;
}

export interface ReviewFilter {
  type: "subject" | "topic" | "subtopic" | "bookmarks" | "frequently_wrong";
  id?: string;
}

export interface ReviewQuestionsResult {
  questions: Question[];
  isLoading: boolean;
  error: string | null;
  dueCount: number;
  newCount: number;
}

type ReviewQuestionRow = {
  id: string;
  stem_text: string;
  choices: unknown;
  subtopic_id: string;
  due_count: number;
  new_count: number;
};

async function fetchReviewQuestionsRpc(limit: number, filter?: ReviewFilter): Promise<ReviewQuestionRow[]> {
  const { data, error } = await supabase.rpc("get_review_questions", {
    _limit: limit,
    _filter_type: filter?.type ?? "bookmarks",
    _filter_id: filter?.id ?? null,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as ReviewQuestionRow[];
}

export function useReviewQuestions(
  limit: number = 10,
  filter: ReviewFilter = { type: "bookmarks" },
  enabled: boolean = true
): ReviewQuestionsResult {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  const filterType = filter.type;
  const filterId = filter.id;

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let active = true;

    async function fetchQuestions() {
      if (!active) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if ((filterType === "subject" || filterType === "topic" || filterType === "subtopic") && !filterId) {
          if (!active) {
            return;
          }

          setQuestions([]);
          setDueCount(0);
          setNewCount(0);
          setError("فیلتر انتخاب‌شده نامعتبر است");
          return;
        }

        const rows = await fetchReviewQuestionsRpc(limit, { type: filterType, id: filterId });

        if (!active) {
          return;
        }

        const counts = rows[0];
        setDueCount(counts?.due_count ?? 0);
        setNewCount(counts?.new_count ?? 0);

        const parsed: Question[] = rows.map((q) => ({
          id: q.id,
          stem_text: q.stem_text,
          subtopic_id: q.subtopic_id,
          choices: Array.isArray(q.choices) ? (q.choices as string[]) : JSON.parse(q.choices as string),
        }));

        setQuestions(parsed);
      } catch (err) {
        if (!active) {
          return;
        }

        console.error("Error fetching review questions:", err);
        setError("خطا در بارگذاری سوالات");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    fetchQuestions();

    return () => {
      active = false;
    };
  }, [limit, filterType, filterId, enabled]);

  return { questions, isLoading, error, dueCount, newCount };
}
