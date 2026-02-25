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
    staleTime: 5 * 60 * 1000,
  });

  // Fetch today's stats via RPC
  const statsQuery = useQuery({
    queryKey: ["daily-quiz-stats", user?.id],
    queryFn: async (): Promise<DailyQuizStats> => {
      console.log("[DailyQuiz] Fetching stats via RPC...");
      const { data, error } = await supabase.rpc("get_daily_quiz_stats");
      console.log("[DailyQuiz] Stats RPC response:", JSON.stringify({ data, error }));
      if (error) throw error;

      const row = data?.[0];
      const result: DailyQuizStats = {
        has_completed: row?.has_completed ?? false,
        correct_count: row?.correct_count ?? 0,
        total_count: row?.total_count ?? 10,
        percentile: Number(row?.percentile ?? 0),
        total_participants: Number(row?.total_participants ?? 0),
      };
      console.log("[DailyQuiz] Stats parsed:", JSON.stringify(result));
      return result;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 2 * 60_000,
    refetchIntervalInBackground: false,
  });

  // Submit quiz result via RPC
  const submitMutation = useMutation({
    mutationFn: async (correctCount: number) => {
      console.log("[DailyQuiz] Submitting quiz, correctCount:", correctCount);
      const { data, error } = await supabase.rpc("submit_daily_quiz", {
        _correct_count: correctCount,
      });
      console.log("[DailyQuiz] Submit RPC response:", JSON.stringify({ data, error }));
      if (error) throw error;

      const row = data?.[0];
      const percentile = Number(row?.percentile ?? 0);
      const totalParticipants = Number(row?.total_participants ?? 0);

      // CRITICAL: Immediately write has_completed=true to cache
      // This ensures re-entering the page shows CompletedView, not the quiz
      queryClient.setQueryData(["daily-quiz-stats", user?.id], {
        has_completed: true,
        correct_count: correctCount,
        total_count: 10,
        percentile,
        total_participants: totalParticipants,
      } as DailyQuizStats);
      console.log("[DailyQuiz] Cache updated with has_completed=true");

      return {
        percentile,
        total_participants: totalParticipants,
        user_correct: Number(row?.user_correct ?? 0),
      };
    },
  });

  return {
    questions: questionsQuery.data ?? [],
    isLoadingQuestions: questionsQuery.isLoading,
    questionsError: questionsQuery.error ? "خطا در بارگذاری آزمون روز" : null,

    stats: statsQuery.data ?? null,
    isLoadingStats: statsQuery.isLoading,
    isRefreshingStats: statsQuery.isFetching && !statsQuery.isLoading,
    statsError: statsQuery.error,

    submitQuiz: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    submitResult: submitMutation.data ?? null,
  };
}
