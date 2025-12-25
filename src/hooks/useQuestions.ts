import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Question {
  id: string;
  stem_text: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  subtopic_id: string;
}

export interface QuestionsResult {
  questions: Question[];
  isLoading: boolean;
  error: string | null;
  totalAvailable: number;
}

export function useQuestions(limit: number = 10): QuestionsResult {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalAvailable, setTotalAvailable] = useState(0);

  useEffect(() => {
    async function fetchQuestions() {
      setIsLoading(true);
      setError(null);

      try {
        // Get total count
        const { count } = await supabase
          .from("questions")
          .select("*", { count: "exact", head: true });

        setTotalAvailable(count || 0);

        // Fetch questions with limit
        const { data, error: fetchError } = await supabase
          .from("questions")
          .select("id, stem_text, choices, correct_index, explanation, subtopic_id")
          .limit(limit);

        if (fetchError) {
          throw fetchError;
        }

        // Parse choices from JSONB
        const parsedQuestions: Question[] = (data || []).map((q) => ({
          ...q,
          choices: Array.isArray(q.choices) ? q.choices : JSON.parse(q.choices as string),
        }));

        setQuestions(parsedQuestions);
      } catch (err) {
        console.error("Error fetching questions:", err);
        setError("خطا در بارگذاری سوالات");
      } finally {
        setIsLoading(false);
      }
    }

    fetchQuestions();
  }, [limit]);

  return { questions, isLoading, error, totalAvailable };
}

export function useTodayCount(): { count: number; isLoading: boolean } {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCount() {
      try {
        const { count: total } = await supabase
          .from("questions")
          .select("*", { count: "exact", head: true });
        
        setCount(total || 0);
      } catch (err) {
        console.error("Error fetching count:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCount();
  }, []);

  return { count, isLoading };
}
