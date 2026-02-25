import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Get today's date in UTC as YYYY-MM-DD (matches PostgreSQL CURRENT_DATE on Supabase) */
function getTodayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Lightweight hook for ExamPage — only fetches today's completion status
 * via DIRECT TABLE QUERY (no RPC dependency).
 */
export function useDailyQuizStatus() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["daily-quiz-stats", user?.id],
    queryFn: async () => {
      const today = getTodayUTC();

      const { data: attempt, error } = await supabase
        .from("daily_quiz_attempts")
        .select("correct_count, total_count, completed_at")
        .eq("quiz_date", today)
        .not("completed_at", "is", null)
        .maybeSingle();

      if (error) throw error;

      if (!attempt) {
        return { has_completed: false, correct_count: 0, total_count: 10, percentile: 0 };
      }

      // Percentile via RPC (SECURITY DEFINER bypasses RLS for cross-user counting)
      let percentile = 0;
      try {
        const { data: rpcData } = await supabase.rpc("get_daily_quiz_stats");
        const row = rpcData?.[0];
        if (row) percentile = Number(row.percentile ?? 0);
      } catch {
        // Not critical for ExamPage card
      }

      return {
        has_completed: true,
        correct_count: attempt.correct_count,
        total_count: attempt.total_count,
        percentile,
      };
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always" as const,
  });

  return {
    hasCompleted: query.data?.has_completed ?? false,
    correctCount: query.data?.correct_count ?? 0,
    totalCount: query.data?.total_count ?? 10,
    percentile: query.data?.percentile ?? 0,
    isLoading: query.isLoading,
  };
}
