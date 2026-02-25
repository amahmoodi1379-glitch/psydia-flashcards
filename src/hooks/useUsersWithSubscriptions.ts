import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserWithSubscription {
  id: string;
  display_name: string | null;
  telegram_id: string | null;
  telegram_username: string | null;
  created_at: string;
  updated_at: string;
  attempt_count: number;
  correct_count: number;
  is_admin: boolean;
  subscription: {
    plan: string;
    expires_at: string | null;
    is_active: boolean;
    duration: string | null;
  } | null;
}

interface AdminUsersPageResult {
  rows: UserWithSubscription[];
  totalCount: number;
  statsLastRefreshedAt: string | null;
}

interface UseUsersWithSubscriptionsParams {
  page: number;
  pageSize: number;
  search?: string;
}

async function fetchUsersWithSubscriptions({ page, pageSize, search }: UseUsersWithSubscriptionsParams): Promise<AdminUsersPageResult> {
  const normalizedSearch = search?.trim() || null;

  const { data, error } = await supabase.rpc("get_admin_users_page", {
    _page: page,
    _page_size: pageSize,
    _search: normalizedSearch,
  });

  if (error) {
    console.error("Error fetching users:", error);
    toast.error("خطا در دریافت کاربران");
    throw error;
  }

  const payload = data?.[0];
  const rows = Array.isArray(payload?.rows) ? (payload.rows as UserWithSubscription[]) : [];

  return {
    rows,
    totalCount: Number(payload?.total_count) || 0,
    statsLastRefreshedAt: payload?.stats_last_refreshed_at ?? null,
  };
}

export function useUsersWithSubscriptions(params: UseUsersWithSubscriptionsParams) {
  return useQuery({
    queryKey: ["admin-users-subscriptions", params.page, params.pageSize, params.search?.trim() || ""],
    queryFn: () => fetchUsersWithSubscriptions(params),
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}
