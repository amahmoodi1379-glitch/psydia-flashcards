import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Subtopic {
  id: string;
  title: string;
  topic_id: string;
  display_order: number;
  questionCount: number;
}

export interface Topic {
  id: string;
  title: string;
  subject_id: string;
  display_order: number;
  subtopics: Subtopic[];
  questionCount: number;
}

export interface Subject {
  id: string;
  title: string;
  display_order: number;
  topics: Topic[];
  questionCount: number;
}

export interface SubjectHierarchyResult {
  subjects: Subject[];
  isLoading: boolean;
  error: string | null;
}

export function useSubjectHierarchy(): SubjectHierarchyResult {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHierarchy() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all data in parallel
        const [subjectsRes, topicsRes, subtopicsRes, questionsRes] = await Promise.all([
          supabase.from("subjects").select("*").order("display_order"),
          supabase.from("topics").select("*").order("display_order"),
          supabase.from("subtopics").select("*").order("display_order"),
          supabase.from("questions").select("id, subtopic_id").eq("is_active", true),
        ]);

        if (subjectsRes.error) throw subjectsRes.error;
        if (topicsRes.error) throw topicsRes.error;
        if (subtopicsRes.error) throw subtopicsRes.error;
        if (questionsRes.error) throw questionsRes.error;

        // Count questions per subtopic
        const questionCountMap = new Map<string, number>();
        questionsRes.data?.forEach((q) => {
          const current = questionCountMap.get(q.subtopic_id) || 0;
          questionCountMap.set(q.subtopic_id, current + 1);
        });

        // Build subtopics with counts
        const subtopicsWithCounts: Subtopic[] = (subtopicsRes.data || []).map((st) => ({
          ...st,
          questionCount: questionCountMap.get(st.id) || 0,
        }));

        // Group subtopics by topic
        const subtopicsByTopic = new Map<string, Subtopic[]>();
        subtopicsWithCounts.forEach((st) => {
          const list = subtopicsByTopic.get(st.topic_id) || [];
          list.push(st);
          subtopicsByTopic.set(st.topic_id, list);
        });

        // Build topics with subtopics
        const topicsWithSubtopics: Topic[] = (topicsRes.data || []).map((t) => {
          const subs = subtopicsByTopic.get(t.id) || [];
          return {
            ...t,
            subtopics: subs,
            questionCount: subs.reduce((sum, s) => sum + s.questionCount, 0),
          };
        });

        // Group topics by subject
        const topicsBySubject = new Map<string, Topic[]>();
        topicsWithSubtopics.forEach((t) => {
          const list = topicsBySubject.get(t.subject_id) || [];
          list.push(t);
          topicsBySubject.set(t.subject_id, list);
        });

        // Build final subjects
        const finalSubjects: Subject[] = (subjectsRes.data || []).map((s) => {
          const tops = topicsBySubject.get(s.id) || [];
          return {
            ...s,
            topics: tops,
            questionCount: tops.reduce((sum, t) => sum + t.questionCount, 0),
          };
        });

        setSubjects(finalSubjects);
      } catch (err) {
        console.error("Error fetching subject hierarchy:", err);
        setError("خطا در بارگذاری دروس");
      } finally {
        setIsLoading(false);
      }
    }

    fetchHierarchy();
  }, []);

  return { subjects, isLoading, error };
}
