import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserWithSubscription {
  id: string;
  display_name: string | null;
  telegram_id: string | null;
  created_at: string;
  updated_at: string;
  attempt_count: number;
  correct_count: number;
  subscription?: {
    plan: string;
    expires_at: string | null;
    is_active: boolean;
    duration: string | null;
  } | null;
}

async function fetchUsersWithSubscriptions(): Promise<UserWithSubscription[]> {
  // First get users stats
  const { data: users, error: usersError } = await supabase.rpc("get_admin_users_stats");

  if (usersError) {
    console.error("Error fetching users:", usersError);
    toast.error("خطا در دریافت کاربران");
    throw usersError;
  }

  // Then get all subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from("subscriptions")
    .select("*");

  if (subError) {
    console.error("Error fetching subscriptions:", subError);
  }

  const subscriptionMap = new Map(
    (subscriptions || []).map((s) => [s.user_id, s])
  );

  return (users || []).map((u) => ({
    id: u.id,
    display_name: u.display_name,
    telegram_id: u.telegram_id,
    created_at: u.created_at,
    updated_at: u.updated_at,
    attempt_count: Number(u.attempt_count) || 0,
    correct_count: Number(u.correct_count) || 0,
    subscription: subscriptionMap.get(u.id) ? {
      plan: subscriptionMap.get(u.id)!.plan,
      expires_at: subscriptionMap.get(u.id)!.expires_at,
      is_active: subscriptionMap.get(u.id)!.is_active,
      duration: subscriptionMap.get(u.id)!.duration,
    } : null,
  }));
}

export function useUsersWithSubscriptions() {
  return useQuery({
    queryKey: ["admin-users-subscriptions"],
    queryFn: fetchUsersWithSubscriptions,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });
}
