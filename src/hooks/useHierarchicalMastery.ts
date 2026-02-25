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

export function useHierarchicalMastery() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["hierarchical-mastery", user?.id],
    queryFn: async (): Promise<SubjectData[]> => {
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
