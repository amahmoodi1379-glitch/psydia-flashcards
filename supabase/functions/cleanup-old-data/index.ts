import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results: Record<string, number> = {};

    console.log("Starting cleanup job...");

    // 1. Delete old daily_usage records (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

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

    // 2. Delete old pending payment logs (older than 24 hours and still pending)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: deletedPayments, error: paymentError } = await supabase
      .from("payment_logs")
      .delete()
      .eq("status", "pending")
      .lt("created_at", oneDayAgo.toISOString())
      .select("id");

    if (paymentError) {
      console.error("Error deleting old pending payments:", paymentError);
    } else {
      results.pending_payments_deleted = deletedPayments?.length || 0;
      console.log(`Deleted ${results.pending_payments_deleted} old pending payment logs`);
    }

    // 3. Optional: Delete very old attempt_logs (older than 2 years) - commented out for now
    // Uncomment when database grows significantly
    /*
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const { data: deletedAttempts, error: attemptError } = await supabase
      .from("attempt_logs")
      .delete()
      .lt("created_at", twoYearsAgo.toISOString())
      .select("id");

    if (attemptError) {
      console.error("Error deleting old attempt logs:", attemptError);
    } else {
      results.attempt_logs_deleted = deletedAttempts?.length || 0;
      console.log(`Deleted ${results.attempt_logs_deleted} old attempt logs`);
    }
    */

    // 4. Deactivate expired subscriptions
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in cleanup-old-data:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
