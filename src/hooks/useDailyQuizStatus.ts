import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Lightweight hook for ExamPage — fetches today's completion status via RPC.
 * Shares cache key with useDailyQuiz so setQueryData from submit is visible here.
 */
export function useDailyQuizStatus() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["daily-quiz-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_daily_quiz_stats");
      if (error) throw error;

      const row = data?.[0];
      return {
        has_completed: row?.has_completed ?? false,
        correct_count: row?.correct_count ?? 0,
        total_count: row?.total_count ?? 10,
        percentile: Number(row?.percentile ?? 0),
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
