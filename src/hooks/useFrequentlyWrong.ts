import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useFrequentlyWrong() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["frequently-wrong", user?.id],
    queryFn: async () => {
      if (!user) return { count: 0, questions: [] };

      const { data, error } = await supabase.rpc("get_frequently_wrong_questions");

      if (error) {
        console.error("Error fetching frequently wrong questions:", error);
        return { count: 0, questions: [] };
      }

      return {
        count: data?.length || 0,
        questions: data || [],
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  return {
    wrongCount: data?.count || 0,
    wrongQuestions: data?.questions || [],
    isLoading,
  };
}