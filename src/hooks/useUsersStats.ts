import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  display_name: string | null;
  telegram_id: string | null;
  created_at: string;
  updated_at: string;
  attempt_count: number;
  correct_count: number;
}

async function fetchUsersStats(): Promise<UserProfile[]> {
  const { data, error } = await supabase.rpc("get_admin_users_stats");

  if (error) {
    console.error("Error fetching users:", error);
    toast.error("خطا در دریافت کاربران");
    throw error;
  }

  return (data || []).map((u) => ({
    id: u.id,
    display_name: u.display_name,
    telegram_id: u.telegram_id,
    created_at: u.created_at,
    updated_at: u.updated_at,
    attempt_count: Number(u.attempt_count) || 0,
    correct_count: Number(u.correct_count) || 0,
  }));
}

export function useUsersStats() {
  return useQuery({
    queryKey: ["admin-users-stats"],
    queryFn: fetchUsersStats,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });
}
