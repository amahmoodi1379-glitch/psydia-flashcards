import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  correct_count: number;
  total_count: number;
  score: number;
  accuracy: number;
};

export type UserRank = {
  rank: number;
  correct_count: number;
  total_count: number;
  score: number;
  accuracy: number;
};

export function useLeaderboard(period: "weekly" | "monthly") {
  const { user } = useAuth();

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const functionName = period === "weekly" ? "get_weekly_leaderboard" : "get_monthly_leaderboard";
      
      const { data, error } = await supabase.rpc(functionName);
      
      if (error) {
        console.error("Error fetching leaderboard:", error);
        throw error;
      }

      return (data || []).map((entry: any) => ({
        rank: Number(entry.rank),
        user_id: entry.user_id,
        display_name: entry.display_name,
        avatar_url: entry.avatar_url,
        correct_count: entry.correct_count,
        total_count: entry.total_count,
        score: entry.score,
        accuracy: Number(entry.accuracy),
      }));
    },
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
  });

  const userRankQuery = useQuery({
    queryKey: ["userRank", period, user?.id],
    queryFn: async (): Promise<UserRank | null> => {
      if (!user?.id) return null;

      const functionName = period === "weekly" ? "get_user_weekly_rank" : "get_user_monthly_rank";
      
      const { data, error } = await supabase.rpc(functionName, {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching user rank:", error);
        return null;
      }

      if (!data || data.length === 0) return null;

      const entry = data[0];
      return {
        rank: Number(entry.rank),
        correct_count: entry.correct_count,
        total_count: entry.total_count,
        score: entry.score,
        accuracy: Number(entry.accuracy),
      };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  return {
    leaderboard: leaderboardQuery.data || [],
    userRank: userRankQuery.data,
    isLoading: leaderboardQuery.isLoading,
    isError: leaderboardQuery.isError,
  };
}
