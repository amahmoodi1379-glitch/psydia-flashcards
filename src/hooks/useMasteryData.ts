import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubtopicMastery {
  name: string;
  mastery: number; // 0-100
}

export function useMasteryData() {
  const { user } = useAuth();

  const { data: subtopics, isLoading } = useQuery({
    queryKey: ["mastery-data", user?.id],
    queryFn: async (): Promise<SubtopicMastery[]> => {
      if (!user) {
        // For guests, return all subtopics with 0 mastery
        const { data: allSubtopics } = await supabase
          .from("subtopics")
          .select("title")
          .order("display_order");

        return (allSubtopics || []).map((s) => ({ name: s.title, mastery: 0 }));
      }

      const { data, error } = await supabase.rpc("get_subtopic_mastery");

      if (error) {
        console.error("Error fetching mastery data:", error);
        return [];
      }

      return (data || []).map((row: { subtopic_name: string; mastery_score: number }) => ({
        name: row.subtopic_name,
        mastery: row.mastery_score || 0,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  return { subtopics: subtopics || [], isLoading };
}
