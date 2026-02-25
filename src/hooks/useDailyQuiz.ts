import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DailyQuizQuestion {
  question_id: string;
  stem_text: string;
  choices: string[];
  display_order: number;
}

export interface DailyQuizStats {
  has_completed: boolean;
  correct_count: number;
  total_count: number;
  percentile: number;
  total_participants: number;
}

export function useDailyQuiz() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch today's quiz questions
  const questionsQuery = useQuery({
    queryKey: ["daily-quiz-questions"],
    queryFn: async (): Promise<DailyQuizQuestion[]> => {
      const { data, error } = await supabase.rpc("get_or_create_daily_quiz");
      if (error) throw error;

      return (data ?? []).map((q: { question_id: string; stem_text: string; choices: unknown; display_order: number }) => ({
        question_id: q.question_id,
        stem_text: q.stem_text,
        choices: Array.isArray(q.choices)
          ? (q.choices as string[])
          : JSON.parse(q.choices as string),
        display_order: q.display_order,
      }));
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch today's stats (percentile, completion status)
  const statsQuery = useQuery({
    queryKey: ["daily-quiz-stats", user?.id],
    queryFn: async (): Promise<DailyQuizStats> => {
      const { data, error } = await supabase.rpc("get_daily_quiz_stats");
      if (error) throw error;

      const row = data?.[0];
      return {
        has_completed: row?.has_completed ?? false,
        correct_count: row?.correct_count ?? 0,
        total_count: row?.total_count ?? 10,
        percentile: Number(row?.percentile ?? 0),
        total_participants: Number(row?.total_participants ?? 0),
      };
    },
    enabled: !!user,
    staleTime: 0, // Always refetch on mount to guarantee fresh has_completed
    refetchOnMount: "always",
    refetchInterval: 2 * 60_000, // Auto-refresh every 2 minutes for live percentile
    refetchIntervalInBackground: false,
  });

  // Submit quiz result
  const submitMutation = useMutation({
    mutationFn: async (correctCount: number) => {
      const { data, error } = await supabase.rpc("submit_daily_quiz", {
        _correct_count: correctCount,
      });
      if (error) throw error;

      const row = data?.[0];
      return {
        percentile: Number(row?.percentile ?? 0),
        total_participants: Number(row?.total_participants ?? 0),
        user_correct: Number(row?.user_correct ?? 0),
      };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["daily-quiz-stats"] });
    },
  });

  return {
    questions: questionsQuery.data ?? [],
    isLoadingQuestions: questionsQuery.isLoading,
    questionsError: questionsQuery.error ? "خطا در بارگذاری آزمون روز" : null,

    stats: statsQuery.data ?? null,
    isLoadingStats: statsQuery.isLoading,
    isRefreshingStats: statsQuery.isFetching && !statsQuery.isLoading,

    submitQuiz: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    submitResult: submitMutation.data ?? null,
  };
}
