import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubjectProgressData {
  name: string;
  progress: number;
  total: number;
}

export function useSubjectProgress() {
  const { user } = useAuth();

  const { data: subjects, isLoading } = useQuery({
    queryKey: ["subject-progress", user?.id],
    queryFn: async (): Promise<SubjectProgressData[]> => {
      if (!user) {
        // For guests, just get total counts per subject
        const { data: allSubjects } = await supabase
          .from("subjects")
          .select("id, title, display_order")
          .order("display_order");

        if (!allSubjects) return [];

        // Get question counts per subject with JOINs
        const result: SubjectProgressData[] = [];
        for (const subject of allSubjects) {
          const { count } = await supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .in(
              "subtopic_id",
              (await supabase
                .from("subtopics")
                .select("id")
                .in(
                  "topic_id",
                  (await supabase.from("topics").select("id").eq("subject_id", subject.id)).data?.map(t => t.id) || []
                )).data?.map(st => st.id) || []
            );

          result.push({
            name: subject.title,
            progress: 0,
            total: count || 0,
          });
        }
        return result;
      }

      const { data, error } = await supabase.rpc("get_subject_progress", {
        _user_id: user.id,
      });

      if (error) {
        console.error("Error fetching subject progress:", error);
        return [];
      }

      return (data || []).map((row: { subject_name: string; answered_count: number; total_count: number }) => ({
        name: row.subject_name,
        progress: Number(row.answered_count) || 0,
        total: Number(row.total_count) || 0,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  return { subjects: subjects || [], isLoading };
}
