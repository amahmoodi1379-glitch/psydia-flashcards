import { useRef } from "react";
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
  const usageCheckResultsRef = useRef<Map<string, boolean>>(new Map());
  const inFlightUsageChecksRef = useRef<Map<string, Promise<boolean>>>(new Map());

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async (): Promise<SubscriptionData | null> => {
      if (!user) return null;

      const { data, error } = await supabase.rpc("get_user_subscription");

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

  const canUseQuestion = async (requestId?: string): Promise<boolean> => {
    if (!user) return false;

    if (requestId) {
      const existingResult = usageCheckResultsRef.current.get(requestId);
      if (existingResult !== undefined) {
        return existingResult;
      }

      const inFlight = inFlightUsageChecksRef.current.get(requestId);
      if (inFlight) {
        return inFlight;
      }
    }

    const checkPromise = (async () => {
      const { data, error } = await supabase.rpc("increment_daily_usage");

      if (error) {
        console.error("Error incrementing usage:", error);
        if (requestId) {
          usageCheckResultsRef.current.set(requestId, false);
        }
        return false;
      }

      const canProceed = data === true;
      if (requestId) {
        usageCheckResultsRef.current.set(requestId, canProceed);
      }

      // Refetch subscription to update UI counter after each usage check.
      await refetch();
      return canProceed;
    })();

    if (requestId) {
      inFlightUsageChecksRef.current.set(requestId, checkPromise);
    }

    try {
      return await checkPromise;
    } finally {
      if (requestId) {
        inFlightUsageChecksRef.current.delete(requestId);
      }
    }
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
