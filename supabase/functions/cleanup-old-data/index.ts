import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLEANUP_CRON_SECRET = Deno.env.get("CLEANUP_CRON_SECRET") || "";
const ATTEMPT_LOG_RETENTION_DAYS = Number(Deno.env.get("ATTEMPT_LOG_RETENTION_DAYS") || "180");

const jsonHeaders = {
  "Content-Type": "application/json",
};

const authorizeRequest = (req: Request): Response | null => {
  if (!CLEANUP_CRON_SECRET) {
    return new Response(
      JSON.stringify({ error: "internal_server_error" }),
      { status: 500, headers: jsonHeaders },
    );
  }

  const cronSecret = req.headers.get("x-cron-secret");

  if (!cronSecret) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: jsonHeaders },
    );
  }

  if (cronSecret !== CLEANUP_CRON_SECRET) {
    return new Response(
      JSON.stringify({ error: "forbidden" }),
      { status: 403, headers: jsonHeaders },
    );
  }

  return null;
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: jsonHeaders },
    );
  }

  const authErrorResponse = authorizeRequest(req);
  if (authErrorResponse) {
    return authErrorResponse;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results: Record<string, number> = {};

    console.log("Starting cleanup job...");

    // 1. Delete old daily_usage records (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const { data: deletedUsage, error: usageError } = await supabase
      .from("daily_usage")
      .delete()
      .lt("usage_date", sevenDaysAgoStr)
      .select("id");

    if (usageError) {
      console.error("Error deleting old daily_usage:", usageError);
    } else {
      results.daily_usage_deleted = deletedUsage?.length || 0;
      console.log(`Deleted ${results.daily_usage_deleted} old daily_usage records`);
    }

    // 2. Delete old attempt_logs (free-tier friendly retention)
    const attemptLogsCutoff = new Date();
    attemptLogsCutoff.setDate(attemptLogsCutoff.getDate() - ATTEMPT_LOG_RETENTION_DAYS);

    const { data: deletedAttempts, error: attemptError } = await supabase
      .from("attempt_logs")
      .delete()
      .lt("created_at", attemptLogsCutoff.toISOString())
      .select("id");

    if (attemptError) {
      console.error("Error deleting old attempt logs:", attemptError);
    } else {
      results.attempt_logs_deleted = deletedAttempts?.length || 0;
      console.log(`Deleted ${results.attempt_logs_deleted} old attempt logs`);
    }

    // 3. Deactivate expired subscriptions

    // 4. Storage monitoring snapshot for heavy tables
    const { data: storageReport, error: storageError } = await supabase.rpc("get_table_storage_report");

    if (storageError) {
      console.error("Error fetching storage report:", storageError);
    } else {
      results.storage_report_count = storageReport?.length || 0;
      console.log("Storage report:", storageReport);
    }

    const { data: expiredSubs, error: subError } = await supabase
      .from("subscriptions")
      .update({ is_active: false })
      .lt("expires_at", new Date().toISOString())
      .eq("is_active", true)
      .select("id");

    if (subError) {
      console.error("Error deactivating expired subscriptions:", subError);
    } else {
      results.subscriptions_deactivated = expiredSubs?.length || 0;
      console.log(`Deactivated ${results.subscriptions_deactivated} expired subscriptions`);
    }

    console.log("Cleanup job completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cleanup completed",
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    console.error("Error in cleanup-old-data:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
