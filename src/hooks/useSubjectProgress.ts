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
        // For guests, use RPC for counts + lightweight structure queries
        const [subjectsRes, topicsRes, subtopicsRes, countRes] = await Promise.all([
          supabase.from("subjects").select("id, title, display_order").order("display_order"),
          supabase.from("topics").select("id, subject_id"),
          supabase.from("subtopics").select("id, topic_id"),
          supabase.rpc("get_question_counts_per_subtopic"),
        ]);

        if (!subjectsRes.data) return [];

        // Map subtopic → topic → subject
        const subtopicToTopic = new Map<string, string>();
        for (const st of subtopicsRes.data || []) {
          subtopicToTopic.set(st.id, st.topic_id);
        }
        const topicToSubject = new Map<string, string>();
        for (const t of topicsRes.data || []) {
          topicToSubject.set(t.id, t.subject_id);
        }

        // Aggregate counts per subject from RPC result
        const countBySubject = new Map<string, number>();
        for (const row of countRes.data || []) {
          const r = row as { subtopic_id: string; question_count: number };
          const topicId = subtopicToTopic.get(r.subtopic_id);
          const subjectId = topicId ? topicToSubject.get(topicId) : undefined;
          if (subjectId) {
            countBySubject.set(subjectId, (countBySubject.get(subjectId) || 0) + Number(r.question_count));
          }
        }

        return subjectsRes.data.map((s) => ({
          name: s.title,
          progress: 0,
          total: countBySubject.get(s.id) || 0,
        }));
      }

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
  });

  return { subjects: subjects || [], isLoading };
}
