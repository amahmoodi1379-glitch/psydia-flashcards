import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubtopicMastery {
  name: string;
  mastery: number; // 0-100
}

export function useMasteryData() {
  const { user } = useAuth();
  const [subtopics, setSubtopics] = useState<SubtopicMastery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMastery = async () => {
      try {
        // Fetch all subtopics
        const { data: allSubtopics } = await supabase
          .from("subtopics")
          .select("id, title")
          .order("display_order");

        if (!allSubtopics || allSubtopics.length === 0) {
          setSubtopics([]);
          setIsLoading(false);
          return;
        }

        if (!user) {
          // Return subtopics with 0 mastery for guests
          setSubtopics(allSubtopics.map((s) => ({ name: s.title, mastery: 0 })));
          setIsLoading(false);
          return;
        }

        // Fetch user's question states
        const { data: questionStates } = await supabase
          .from("user_question_state")
          .select("question_id, box_number")
          .eq("user_id", user.id);

        // Fetch questions to map them to subtopics
        const { data: questions } = await supabase
          .from("questions")
          .select("id, subtopic_id")
          .eq("is_active", true);

        // Calculate mastery per subtopic
        const masteryMap = new Map<string, { total: number; sumBox: number }>();

        allSubtopics.forEach((s) => {
          masteryMap.set(s.id, { total: 0, sumBox: 0 });
        });

        if (questions && questionStates) {
          questionStates.forEach((qs) => {
            const question = questions.find((q) => q.id === qs.question_id);
            if (question && masteryMap.has(question.subtopic_id)) {
              const current = masteryMap.get(question.subtopic_id)!;
              current.total++;
              // Box ranges from 1-7, convert to percentage contribution
              current.sumBox += (qs.box_number / 7) * 100;
            }
          });
        }

        const result = allSubtopics.map((s) => {
          const data = masteryMap.get(s.id);
          const mastery = data && data.total > 0 ? Math.round(data.sumBox / data.total) : 0;
          return { name: s.title, mastery };
        });

        setSubtopics(result);
      } catch (error) {
        console.error("Error fetching mastery data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMastery();
  }, [user]);

  return { subtopics, isLoading };
}
