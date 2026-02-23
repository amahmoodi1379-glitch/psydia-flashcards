import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SubtopicQuestion {
  id: string;
  stem_text: string;
  choices: string[];
  subtopic_id: string;
  is_answered: boolean;
  is_in_leitner: boolean;
}

export interface SubtopicQuestionsResult {
  questions: SubtopicQuestion[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  onlyUnanswered: boolean;
  setOnlyUnanswered: (val: boolean) => void;
  refetch: () => void;
}

const PAGE_SIZE = 10;

export function useSubtopicQuestions(subtopicId: string | undefined): SubtopicQuestionsResult {
  const [questions, setQuestions] = useState<SubtopicQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [onlyUnanswered, setOnlyUnanswered] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [onlyUnanswered, subtopicId]);

  useEffect(() => {
    if (!subtopicId) {
      setQuestions([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    let active = true;

    async function fetchQuestions() {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc("get_subtopic_questions", {
          _subtopic_id: subtopicId!,
          _page: page,
          _page_size: PAGE_SIZE,
          _only_unanswered: onlyUnanswered,
        });

        if (!active) return;

        if (rpcError) throw rpcError;

        const rows = (data ?? []) as Array<{
          id: string;
          stem_text: string;
          choices: unknown;
          subtopic_id: string;
          is_answered: boolean;
          is_in_leitner: boolean;
          total_count: number;
        }>;

        const total = rows[0]?.total_count ?? 0;
        setTotalCount(total);

        const parsed: SubtopicQuestion[] = rows.map((q) => ({
          id: q.id,
          stem_text: q.stem_text,
          subtopic_id: q.subtopic_id,
          choices: Array.isArray(q.choices) ? (q.choices as string[]) : JSON.parse(q.choices as string),
          is_answered: q.is_answered,
          is_in_leitner: q.is_in_leitner,
        }));

        setQuestions(parsed);
      } catch (err) {
        if (!active) return;
        console.error("Error fetching subtopic questions:", err);
        setError("خطا در بارگذاری سوالات");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchQuestions();

    return () => {
      active = false;
    };
  }, [subtopicId, page, onlyUnanswered, fetchKey]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    questions,
    isLoading,
    error,
    totalCount,
    page,
    totalPages,
    setPage,
    onlyUnanswered,
    setOnlyUnanswered,
    refetch,
  };
}
