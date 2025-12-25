import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubjectProgressData {
  name: string;
  progress: number;
  total: number;
}

export function useSubjectProgress() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectProgressData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        // Fetch all subjects
        const { data: allSubjects } = await supabase
          .from("subjects")
          .select("id, title")
          .order("display_order");

        if (!allSubjects || allSubjects.length === 0) {
          setSubjects([]);
          setIsLoading(false);
          return;
        }

        // Fetch topics for each subject
        const { data: topics } = await supabase
          .from("topics")
          .select("id, subject_id");

        // Fetch subtopics for each topic
        const { data: subtopics } = await supabase
          .from("subtopics")
          .select("id, topic_id");

        // Fetch all questions
        const { data: questions } = await supabase
          .from("questions")
          .select("id, subtopic_id")
          .eq("is_active", true);

        // Build mapping: subject_id -> question_ids
        const subjectQuestions = new Map<string, string[]>();
        
        allSubjects.forEach((s) => {
          subjectQuestions.set(s.id, []);
        });

        if (topics && subtopics && questions) {
          questions.forEach((q) => {
            const subtopic = subtopics.find((st) => st.id === q.subtopic_id);
            if (subtopic) {
              const topic = topics.find((t) => t.id === subtopic.topic_id);
              if (topic && subjectQuestions.has(topic.subject_id)) {
                subjectQuestions.get(topic.subject_id)!.push(q.id);
              }
            }
          });
        }

        // Get user's answered questions
        let answeredQuestionIds = new Set<string>();
        
        if (user) {
          const { data: userStates } = await supabase
            .from("user_question_state")
            .select("question_id")
            .eq("user_id", user.id);

          if (userStates) {
            answeredQuestionIds = new Set(userStates.map((s) => s.question_id));
          }
        }

        // Calculate progress for each subject
        const result = allSubjects.map((subject) => {
          const questionIds = subjectQuestions.get(subject.id) || [];
          const total = questionIds.length;
          const progress = questionIds.filter((id) => answeredQuestionIds.has(id)).length;

          return {
            name: subject.title,
            progress,
            total,
          };
        });

        setSubjects(result);
      } catch (error) {
        console.error("Error fetching subject progress:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  return { subjects, isLoading };
}
