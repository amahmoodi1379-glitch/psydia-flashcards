import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DayActivity {
  day: string;
  value: number;
  date: Date;
}

const PERSIAN_DAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function useWeeklyActivity() {
  const { user } = useAuth();
  const [activityData, setActivityData] = useState<DayActivity[]>([]);
  const [totalWeek, setTotalWeek] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateEmptyWeek = (): DayActivity[] => {
      const days: DayActivity[] = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        // Persian calendar: Saturday = 0
        const dayIndex = (date.getDay() + 1) % 7;
        days.push({
          day: PERSIAN_DAYS[dayIndex],
          value: 0,
          date,
        });
      }
      return days;
    };

    if (!user) {
      setActivityData(generateEmptyWeek());
      setTotalWeek(0);
      setIsLoading(false);
      return;
    }

    const fetchActivity = async () => {
      try {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 6);
        weekAgo.setHours(0, 0, 0, 0);

        const { data: attempts } = await supabase
          .from("attempt_logs")
          .select("created_at")
          .eq("user_id", user.id)
          .gte("created_at", weekAgo.toISOString());

        const week = generateEmptyWeek();
        let total = 0;

        if (attempts) {
          attempts.forEach((a) => {
            const attemptDate = new Date(a.created_at);
            attemptDate.setHours(0, 0, 0, 0);
            
            const dayEntry = week.find((d) => {
              const entryDate = new Date(d.date);
              entryDate.setHours(0, 0, 0, 0);
              return entryDate.getTime() === attemptDate.getTime();
            });
            
            if (dayEntry) {
              dayEntry.value++;
              total++;
            }
          });
        }

        setActivityData(week);
        setTotalWeek(total);
      } catch (error) {
        console.error("Error fetching weekly activity:", error);
        setActivityData(generateEmptyWeek());
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [user]);

  return { activityData, totalWeek, isLoading };
}
