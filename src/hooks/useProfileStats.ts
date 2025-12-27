import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileStats {
  totalAnswered: number;
  accuracy: number;
  streak: number;
  displayName: string;
}

export function useProfileStats() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["profile-stats", user?.id],
    queryFn: async (): Promise<ProfileStats> => {
      if (!user) {
        return {
          totalAnswered: 0,
          accuracy: 0,
          streak: 0,
          displayName: "کاربر مهمان",
        };
      }

      const { data, error } = await supabase.rpc("get_user_profile_stats", {
        _user_id: user.id,
      });

      if (error) {
        console.error("Error fetching profile stats:", error);
        return {
          totalAnswered: 0,
          accuracy: 0,
          streak: 0,
          displayName: "کاربر",
        };
      }

      const result = data?.[0];
      if (!result) {
        return {
          totalAnswered: 0,
          accuracy: 0,
          streak: 0,
          displayName: "کاربر",
        };
      }

      const totalAnswered = Number(result.total_answered) || 0;
      const correctCount = Number(result.correct_count) || 0;
      const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

      return {
        totalAnswered,
        accuracy,
        streak: result.streak || 0,
        displayName: result.display_name || "کاربر",
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: true,
  });

  return {
    stats: stats || {
      totalAnswered: 0,
      accuracy: 0,
      streak: 0,
      displayName: "کاربر مهمان",
    },
    isLoading,
  };
}
