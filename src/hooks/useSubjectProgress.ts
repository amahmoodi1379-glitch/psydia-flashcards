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
      const { data, error } = await supabase.rpc("get_subject_progress");

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
    enabled: !!user,
  });

  return { subjects: subjects || [], isLoading };
}
