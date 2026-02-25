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

/** Get today's date in UTC as YYYY-MM-DD (matches PostgreSQL CURRENT_DATE on Supabase) */
function getTodayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

export function useDailyQuiz() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch today's quiz questions (only RPC we still need — generates quiz if none exist)
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

  // Fetch today's completion status via DIRECT TABLE QUERY (no RPC)
  // RLS policy ensures we only see our own row — this is the reliable gate.
  const statsQuery = useQuery({
    queryKey: ["daily-quiz-stats", user?.id],
    queryFn: async (): Promise<DailyQuizStats> => {
      const today = getTodayUTC();
      console.log("[DailyQuiz] Checking completion via direct query, date:", today);

      const { data: attempt, error } = await supabase
        .from("daily_quiz_attempts")
        .select("correct_count, total_count, completed_at")
        .eq("quiz_date", today)
        .not("completed_at", "is", null)
        .maybeSingle();

      console.log("[DailyQuiz] Direct query result:", { attempt, error });
      if (error) throw error;

      if (!attempt) {
        return { has_completed: false, correct_count: 0, total_count: 10, percentile: 0, total_participants: 0 };
      }

      // For percentile, try RPC (SECURITY DEFINER bypasses RLS for counting)
      let percentile = 0;
      let totalParticipants = 0;
      try {
        const { data: rpcData } = await supabase.rpc("get_daily_quiz_stats");
        const row = rpcData?.[0];
        if (row) {
          percentile = Number(row.percentile ?? 0);
          totalParticipants = Number(row.total_participants ?? 0);
        }
      } catch {
        // RPC failed — percentile not critical, just show 0
        console.warn("[DailyQuiz] RPC percentile fallback failed");
      }

      return {
        has_completed: true,
        correct_count: attempt.correct_count,
        total_count: attempt.total_count,
        percentile,
        total_participants: totalParticipants,
      };
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 2 * 60_000,
    refetchIntervalInBackground: false,
  });

  // Submit quiz result via DIRECT TABLE UPSERT (reliable, no RPC dependency)
  const submitMutation = useMutation({
    mutationFn: async (correctCount: number) => {
      const today = getTodayUTC();
      console.log("[DailyQuiz] Submitting:", { correctCount, today, userId: user?.id });

      const { error } = await supabase
        .from("daily_quiz_attempts")
        .upsert(
          {
            user_id: user!.id,
            quiz_date: today,
            correct_count: correctCount,
            total_count: 10,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,quiz_date" }
        );

      console.log("[DailyQuiz] Upsert result:", { error });
      if (error) throw error;

      // Get percentile via RPC (best-effort)
      let percentile = 0;
      let totalParticipants = 0;
      try {
        const { data: rpcData } = await supabase.rpc("submit_daily_quiz", {
          _correct_count: correctCount,
        });
        const row = rpcData?.[0];
        if (row) {
          percentile = Number(row.percentile ?? 0);
          totalParticipants = Number(row.total_participants ?? 0);
        }
      } catch {
        console.warn("[DailyQuiz] RPC percentile failed, showing 0");
      }

      // Update the stats cache immediately with the definitive completion state
      queryClient.setQueryData(["daily-quiz-stats", user?.id], {
        has_completed: true,
        correct_count: correctCount,
        total_count: 10,
        percentile,
        total_participants: totalParticipants,
      } as DailyQuizStats);

      return { percentile, total_participants: totalParticipants, user_correct: correctCount };
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
