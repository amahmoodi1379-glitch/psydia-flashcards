import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LeitnerDueCountResult {
  dueCount: number;
  totalInLeitner: number;
  isLoading: boolean;
}

export function useLeitnerDueCount(): LeitnerDueCountResult {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["leitner-due-count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leitner_due_count");

      if (error) throw error;

      const row = data?.[0];
      return {
        dueCount: Number(row?.due_count ?? 0),
        totalInLeitner: Number(row?.total_in_leitner ?? 0),
      };
    },
    enabled: !!user,
    refetchInterval: 60_000, // Refresh every minute
    refetchIntervalInBackground: false,
  });

  return {
    dueCount: data?.dueCount ?? 0,
    totalInLeitner: data?.totalInLeitner ?? 0,
    isLoading,
  };
}
