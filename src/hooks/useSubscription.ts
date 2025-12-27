import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionData {
  plan: "free" | "basic" | "advanced" | "smart";
  expires_at: string | null;
  is_active: boolean;
  daily_limit: number;
  today_usage: number;
}

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async (): Promise<SubscriptionData | null> => {
      if (!user) return null;

      const { data, error } = await supabase.rpc("get_user_subscription", {
        _user_id: user.id,
      });

      if (error) {
        console.error("Error fetching subscription:", error);
        return {
          plan: "free",
          expires_at: null,
          is_active: true,
          daily_limit: 10,
          today_usage: 0,
        };
      }

      if (!data || data.length === 0) {
        return {
          plan: "free",
          expires_at: null,
          is_active: true,
          daily_limit: 10,
          today_usage: 0,
        };
      }

      const row = data[0];
      return {
        plan: row.plan as SubscriptionData["plan"],
        expires_at: row.expires_at,
        is_active: row.is_active,
        daily_limit: row.daily_limit,
        today_usage: row.today_usage,
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute cache
  });

  const canUseQuestion = async (): Promise<boolean> => {
    if (!user) return false;
    
    const { data, error } = await supabase.rpc("increment_daily_usage", {
      _user_id: user.id,
    });

    if (error) {
      console.error("Error incrementing usage:", error);
      return false;
    }

    // Refetch subscription to update UI
    refetch();
    return data === true;
  };

  const hasFeature = (feature: "bookmarks" | "mastery_map" | "wrong_review" | "extended_activity"): boolean => {
    if (!subscription) return false;
    const advancedFeatures = ["bookmarks", "mastery_map", "wrong_review", "extended_activity"];
    if (advancedFeatures.includes(feature)) {
      return subscription.plan === "advanced" || subscription.plan === "smart";
    }
    return true;
  };

  return {
    subscription,
    isLoading,
    canUseQuestion,
    hasFeature,
    isPaidUser: subscription?.plan !== "free" && subscription?.is_active,
    refetch,
  };
}
