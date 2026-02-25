import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubtopicData {
  id: string;
  name: string;
  mastery: number;
}

interface TopicData {
  id: string;
  name: string;
  mastery: number;
  subtopics: SubtopicData[];
}

interface SubjectData {
  id: string;
  name: string;
  mastery: number;
  topics: TopicData[];
}

interface GuestSubtopic {
  id: string;
  title: string;
}

interface GuestTopic {
  id: string;
  title: string;
  subtopics: GuestSubtopic[];
}

interface GuestSubject {
  id: string;
  title: string;
  topics: GuestTopic[];
}

export function useHierarchicalMastery() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["hierarchical-mastery", user?.id],
    queryFn: async (): Promise<SubjectData[]> => {
      if (!user) {
        // Return structure with 0 mastery for guests
        const { data: subjects } = await supabase
          .from("subjects")
          .select(`
            id,
            title,
            topics (
              id,
              title,
              subtopics (
                id,
                title
              )
            )
          `)
          .order("display_order");

        return ((subjects || []) as GuestSubject[]).map((s) => ({
          id: s.id,
          name: s.title,
          mastery: 0,
          topics: (s.topics || []).map((t) => ({
            id: t.id,
            name: t.title,
            mastery: 0,
            subtopics: (t.subtopics || []).map((st) => ({
              id: st.id,
              name: st.title,
              mastery: 0,
            })),
          })),
        }));
      }

      const { data, error } = await supabase.rpc("get_hierarchical_mastery");

      if (error) {
        console.error("Error fetching hierarchical mastery:", error);
        return [];
      }

      // Transform flat data into hierarchical structure
      const subjectsMap = new Map<string, SubjectData>();

      for (const row of data || []) {
        if (!subjectsMap.has(row.subject_id)) {
          subjectsMap.set(row.subject_id, {
            id: row.subject_id,
            name: row.subject_name,
            mastery: row.subject_mastery,
            topics: [],
          });
        }

        const subject = subjectsMap.get(row.subject_id)!;
        let topic = subject.topics.find((t) => t.id === row.topic_id);

        if (!topic) {
          topic = {
            id: row.topic_id,
            name: row.topic_name,
            mastery: row.topic_mastery,
            subtopics: [],
          };
          subject.topics.push(topic);
        }

        if (!topic.subtopics.find((st) => st.id === row.subtopic_id)) {
          topic.subtopics.push({
            id: row.subtopic_id,
            name: row.subtopic_name,
            mastery: row.subtopic_mastery,
          });
        }
      }

      return Array.from(subjectsMap.values());
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !!user,
  });

  return { subjects: data || [], isLoading };
}
