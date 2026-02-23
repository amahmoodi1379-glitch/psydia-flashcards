import { useQuery } from "@tanstack/react-query";
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

async function fetchHierarchy(): Promise<Subject[]> {
  // Fetch structure + aggregated question counts in parallel
  const [subjectsRes, topicsRes, subtopicsRes, countRes] = await Promise.all([
    supabase.from("subjects").select("*").order("display_order"),
    supabase.from("topics").select("*").order("display_order"),
    supabase.from("subtopics").select("*").order("display_order"),
    supabase.rpc("get_question_counts_per_subtopic"),
  ]);

  if (subjectsRes.error) throw subjectsRes.error;
  if (topicsRes.error) throw topicsRes.error;
  if (subtopicsRes.error) throw subtopicsRes.error;
  if (countRes.error) throw countRes.error;

  // Build count map from RPC result (tiny payload: only subtopic_id + count)
  const questionCountMap = new Map<string, number>();
  (countRes.data || []).forEach((row: { subtopic_id: string; question_count: number }) => {
    questionCountMap.set(row.subtopic_id, Number(row.question_count));
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
  return (subjectsRes.data || []).map((s) => {
    const tops = topicsBySubject.get(s.id) || [];
    return {
      ...s,
      topics: tops,
      questionCount: tops.reduce((sum, t) => sum + t.questionCount, 0),
    };
  });
}

export function useSubjectHierarchy(): SubjectHierarchyResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["subject-hierarchy"],
    queryFn: fetchHierarchy,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  return {
    subjects: data || [],
    isLoading,
    error: error ? "خطا در بارگذاری دروس" : null,
  };
}
