import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileStats {
  totalAnswered: number;
  accuracy: number;
  streak: number;
  displayName: string;
}

export function useProfileStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProfileStats>({
    totalAnswered: 0,
    accuracy: 0,
    streak: 0,
    displayName: "کاربر مهمان",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStats({
        totalAnswered: 0,
        accuracy: 0,
        streak: 0,
        displayName: "کاربر مهمان",
      });
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        // Fetch profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();

        // Fetch attempt logs
        const { data: attempts } = await supabase
          .from("attempt_logs")
          .select("is_correct, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        const totalAnswered = attempts?.length ?? 0;
        const correctCount = attempts?.filter((a) => a.is_correct).length ?? 0;
        const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

        // Calculate streak
        let streak = 0;
        if (attempts && attempts.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const uniqueDates = new Set<string>();
          attempts.forEach((a) => {
            const date = new Date(a.created_at);
            date.setHours(0, 0, 0, 0);
            uniqueDates.add(date.toISOString());
          });
          
          const sortedDates = Array.from(uniqueDates).sort().reverse();
          
          for (let i = 0; i < sortedDates.length; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            
            if (sortedDates.includes(checkDate.toISOString())) {
              streak++;
            } else if (i === 0) {
              // Check if they answered yesterday (streak can still be valid)
              continue;
            } else {
              break;
            }
          }
        }

        setStats({
          totalAnswered,
          accuracy,
          streak,
          displayName: profile?.display_name || "کاربر",
        });
      } catch (error) {
        console.error("Error fetching profile stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return { stats, isLoading };
}
