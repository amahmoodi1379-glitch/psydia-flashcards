import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

interface SubtopicQuestionsData {
  questions: SubtopicQuestion[];
  totalCount: number;
}

async function fetchSubtopicQuestions(
  subtopicId: string,
  page: number,
  onlyUnanswered: boolean
): Promise<SubtopicQuestionsData> {
  const { data, error } = await supabase.rpc("get_subtopic_questions", {
    _subtopic_id: subtopicId,
    _page: page,
    _page_size: PAGE_SIZE,
    _only_unanswered: onlyUnanswered,
  });

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    stem_text: string;
    choices: unknown;
    subtopic_id: string;
    is_answered: boolean;
    is_in_leitner: boolean;
    total_count: number;
  }>;

  return {
    totalCount: rows[0]?.total_count ?? 0,
    questions: rows.map((q) => ({
      id: q.id,
      stem_text: q.stem_text,
      subtopic_id: q.subtopic_id,
      choices: Array.isArray(q.choices) ? (q.choices as string[]) : JSON.parse(q.choices as string),
      is_answered: q.is_answered,
      is_in_leitner: q.is_in_leitner,
    })),
  };
}

export function useSubtopicQuestions(subtopicId: string | undefined): SubtopicQuestionsResult {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [onlyUnanswered, setOnlyUnanswered] = useState(false);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [onlyUnanswered, subtopicId]);

  const queryKey = ["subtopic-questions", subtopicId, page, onlyUnanswered];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchSubtopicQuestions(subtopicId!, page, onlyUnanswered),
    enabled: !!subtopicId,
    staleTime: 30_000, // 30 seconds cache for subtopic browsing
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["subtopic-questions", subtopicId] });
  }, [queryClient, subtopicId]);

  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    questions: data?.questions ?? [],
    isLoading,
    error: error ? "خطا در بارگذاری سوالات" : null,
    totalCount,
    page,
    totalPages,
    setPage,
    onlyUnanswered,
    setOnlyUnanswered,
    refetch,
  };
}
