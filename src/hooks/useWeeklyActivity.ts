import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DayActivity {
  day: string;
  value: number;
  date: Date;
}

const PERSIAN_DAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

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

export function useWeeklyActivity() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["weekly-activity", user?.id],
    queryFn: async () => {
      const emptyWeek = generateEmptyWeek();

      if (!user) {
        return { activityData: emptyWeek, totalWeek: 0 };
      }

      const { data: activityRows, error } = await supabase.rpc("get_weekly_activity");

      if (error) {
        console.error("Error fetching weekly activity:", error);
        return { activityData: emptyWeek, totalWeek: 0 };
      }

      let total = 0;
      const week = generateEmptyWeek();

      (activityRows || []).forEach((row: { activity_date: string; activity_count: number }) => {
        const activityDate = new Date(row.activity_date);
        activityDate.setHours(0, 0, 0, 0);
        
        const dayEntry = week.find((d) => {
          const entryDate = new Date(d.date);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === activityDate.getTime();
        });
        
        if (dayEntry) {
          dayEntry.value = Number(row.activity_count) || 0;
          total += dayEntry.value;
        }
      });

      return { activityData: week, totalWeek: total };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache (activity changes more frequently)
  });

  return {
    activityData: data?.activityData || generateEmptyWeek(),
    totalWeek: data?.totalWeek || 0,
    isLoading,
  };
}
