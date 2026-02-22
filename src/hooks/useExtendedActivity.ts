import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ActivityRange = 30 | 90 | 180 | 365;

export function useExtendedActivity(days: ActivityRange = 30) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["extended-activity", user?.id, days],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.rpc("get_extended_activity", {
        _days: days,
      });

      if (error) {
        console.error("Error fetching extended activity:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate statistics
  const totalQuestions = data?.reduce((sum, day) => sum + Number(day.activity_count), 0) || 0;
  const activeDays = data?.length || 0;
  const avgPerDay = activeDays > 0 ? Math.round(totalQuestions / activeDays) : 0;

  return {
    activityData: data || [],
    totalQuestions,
    activeDays,
    avgPerDay,
    isLoading,
  };
}