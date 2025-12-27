import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Question {
  id: string;
  stem_text: string;
  choices: string[];
  subtopic_id: string;
}

export interface ReviewFilter {
  type: "daily" | "subject" | "topic" | "subtopic" | "bookmarks";
  id?: string; // subject_id, topic_id, or subtopic_id
}

export interface ReviewQuestionsResult {
  questions: Question[];
  isLoading: boolean;
  error: string | null;
  dueCount: number;
  newCount: number;
}

export function useReviewQuestions(
  limit: number = 10,
  filter: ReviewFilter = { type: "daily" }
): ReviewQuestionsResult {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    async function fetchQuestions() {
      setIsLoading(true);
      setError(null);

      try {
        // Handle bookmarks filter
        if (filter.type === "bookmarks" && user) {
          const { data: bookmarks, error: bookmarksError } = await supabase
            .from("bookmarks")
            .select("question_id")
            .eq("user_id", user.id);

          if (bookmarksError) throw bookmarksError;

          if (!bookmarks || bookmarks.length === 0) {
            setQuestions([]);
            setDueCount(0);
            setNewCount(0);
            setIsLoading(false);
            return;
          }

          const bookmarkedIds = bookmarks.map((b) => b.question_id);

          const { data: bookmarkedQuestions, error: qError } = await supabase
            .from("questions_safe")
            .select("id, stem_text, choices, subtopic_id")
            .in("id", bookmarkedIds);

          if (qError) throw qError;

          const limited = (bookmarkedQuestions || []).slice(0, limit);
          const parsed: Question[] = limited.map((q) => ({
            ...q,
            choices: Array.isArray(q.choices)
              ? q.choices
              : JSON.parse(q.choices as string),
          }));

          setQuestions(parsed);
          setDueCount(parsed.length);
          setNewCount(0);
          setIsLoading(false);
          return;
        }

        // Get subtopic_ids based on filter
        let subtopicIds: string[] = [];
        
        if (filter.type === "subtopic" && filter.id) {
          subtopicIds = [filter.id];
        } else if (filter.type === "topic" && filter.id) {
          const { data: subtopics } = await supabase
            .from("subtopics")
            .select("id")
            .eq("topic_id", filter.id);
          subtopicIds = subtopics?.map((s) => s.id) || [];
        } else if (filter.type === "subject" && filter.id) {
          const { data: topics } = await supabase
            .from("topics")
            .select("id")
            .eq("subject_id", filter.id);
          const topicIds = topics?.map((t) => t.id) || [];
          
          if (topicIds.length > 0) {
            const { data: subtopics } = await supabase
              .from("subtopics")
              .select("id")
              .in("topic_id", topicIds);
            subtopicIds = subtopics?.map((s) => s.id) || [];
          }
        }

        // Use questions_safe view - no correct_index exposed!
        let questionsQuery = supabase
          .from("questions_safe")
          .select("id, stem_text, choices, subtopic_id");

        // Apply subtopic filter if not daily review
        if (filter.type !== "daily" && subtopicIds.length > 0) {
          questionsQuery = questionsQuery.in("subtopic_id", subtopicIds);
        }

        const { data: allQuestions, error: questionsError } = await questionsQuery;

        if (questionsError) throw questionsError;

        if (!allQuestions || allQuestions.length === 0) {
          setQuestions([]);
          setDueCount(0);
          setNewCount(0);
          setIsLoading(false);
          return;
        }

        const questionIds = allQuestions.map((q) => q.id);

        // If user is logged in, filter by SM2
        if (user) {
          const { data: userStates } = await supabase
            .from("user_question_state")
            .select("question_id, next_review_at")
            .eq("user_id", user.id)
            .in("question_id", questionIds);

          const stateMap = new Map(
            userStates?.map((s) => [s.question_id, s.next_review_at]) || []
          );

          const now = new Date();
          
          // Separate due and new questions
          const dueQuestions: typeof allQuestions = [];
          const newQuestions: typeof allQuestions = [];

          allQuestions.forEach((q) => {
            const nextReview = stateMap.get(q.id);
            if (!nextReview) {
              newQuestions.push(q);
            } else if (new Date(nextReview) <= now) {
              dueQuestions.push(q);
            }
          });

          setDueCount(dueQuestions.length);
          setNewCount(newQuestions.length);

          // Prioritize due questions, then add new ones
          const orderedQuestions = [...dueQuestions, ...newQuestions].slice(0, limit);

          const parsed: Question[] = orderedQuestions.map((q) => ({
            ...q,
            choices: Array.isArray(q.choices)
              ? q.choices
              : JSON.parse(q.choices as string),
          }));

          setQuestions(parsed);
        } else {
          // No user - just return random questions
          const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
          const limited = shuffled.slice(0, limit);

          const parsed: Question[] = limited.map((q) => ({
            ...q,
            choices: Array.isArray(q.choices)
              ? q.choices
              : JSON.parse(q.choices as string),
          }));

          setQuestions(parsed);
          setDueCount(0);
          setNewCount(allQuestions.length);
        }
      } catch (err) {
        console.error("Error fetching review questions:", err);
        setError("خطا در بارگذاری سوالات");
      } finally {
        setIsLoading(false);
      }
    }

    fetchQuestions();
  }, [limit, filter.type, filter.id, user]);

  return { questions, isLoading, error, dueCount, newCount };
}

export function useDueCount(filter?: ReviewFilter): {
  dueCount: number;
  newCount: number;
  total: number;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const [dueCount, setDueCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      setIsLoading(true);
      
      try {
        // Get subtopic_ids based on filter
        let subtopicIds: string[] = [];
        
        if (filter?.type === "subtopic" && filter.id) {
          subtopicIds = [filter.id];
        } else if (filter?.type === "topic" && filter.id) {
          const { data: subtopics } = await supabase
            .from("subtopics")
            .select("id")
            .eq("topic_id", filter.id);
          subtopicIds = subtopics?.map((s) => s.id) || [];
        } else if (filter?.type === "subject" && filter.id) {
          const { data: topics } = await supabase
            .from("topics")
            .select("id")
            .eq("subject_id", filter.id);
          const topicIds = topics?.map((t) => t.id) || [];
          
          if (topicIds.length > 0) {
            const { data: subtopics } = await supabase
              .from("subtopics")
              .select("id")
              .in("topic_id", topicIds);
            subtopicIds = subtopics?.map((s) => s.id) || [];
          }
        }

        // Use questions_safe view
        let query = supabase
          .from("questions_safe")
          .select("id");

        if (subtopicIds.length > 0) {
          query = query.in("subtopic_id", subtopicIds);
        }

        const { data: allQuestions } = await query;
        const questionIds = allQuestions?.map((q) => q.id) || [];
        setTotal(questionIds.length);

        if (!user || questionIds.length === 0) {
          setDueCount(0);
          setNewCount(questionIds.length);
          setIsLoading(false);
          return;
        }

        const { data: userStates } = await supabase
          .from("user_question_state")
          .select("question_id, next_review_at")
          .eq("user_id", user.id)
          .in("question_id", questionIds);

        const stateMap = new Map(
          userStates?.map((s) => [s.question_id, s.next_review_at]) || []
        );

        const now = new Date();
        let due = 0;
        let newQ = 0;

        questionIds.forEach((id) => {
          const nextReview = stateMap.get(id);
          if (!nextReview) {
            newQ++;
          } else if (new Date(nextReview) <= now) {
            due++;
          }
        });

        setDueCount(due);
        setNewCount(newQ);
      } catch (err) {
        console.error("Error fetching due count:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCounts();
  }, [filter?.type, filter?.id, user]);

  return { dueCount, newCount, total, isLoading };
}
