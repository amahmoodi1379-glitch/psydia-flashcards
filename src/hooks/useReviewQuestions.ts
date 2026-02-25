import { useQuery } from "@tanstack/react-query";
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

interface ParsedReviewData {
  questions: Question[];
  dueCount: number;
  newCount: number;
}

async function fetchReviewQuestionsRpc(
  limit: number,
  filterType: string,
  filterId: string | undefined
): Promise<ParsedReviewData> {
  if ((filterType === "subject" || filterType === "topic" || filterType === "subtopic") && !filterId) {
    throw new Error("فیلتر انتخاب‌شده نامعتبر است");
  }

  const { data, error } = await supabase.rpc("get_review_questions", {
    _limit: limit,
    _filter_type: filterType,
    _filter_id: filterId ?? null,
  });

  if (error) throw error;

  const rows = (data ?? []) as ReviewQuestionRow[];
  const counts = rows[0];

  return {
    questions: rows.map((q) => ({
      id: q.id,
      stem_text: q.stem_text,
      subtopic_id: q.subtopic_id,
      choices: Array.isArray(q.choices) ? (q.choices as string[]) : JSON.parse(q.choices as string),
    })),
    dueCount: counts?.due_count ?? 0,
    newCount: counts?.new_count ?? 0,
  };
}

export function useReviewQuestions(
  limit: number = 10,
  filter: ReviewFilter = { type: "bookmarks" },
  enabled: boolean = true
): ReviewQuestionsResult {
  const filterType = filter.type;
  const filterId = filter.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["review-questions", limit, filterType, filterId],
    queryFn: () => fetchReviewQuestionsRpc(limit, filterType, filterId),
    enabled,
    staleTime: 0, // Always fetch fresh review questions
  });

  return {
    questions: data?.questions ?? [],
    isLoading,
    error: error ? (error instanceof Error ? error.message : "خطا در بارگذاری سوالات") : null,
    dueCount: data?.dueCount ?? 0,
    newCount: data?.newCount ?? 0,
  };
}
