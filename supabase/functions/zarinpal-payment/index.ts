import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZARINPAL_MERCHANT_ID = Deno.env.get("ZARINPAL_MERCHANT_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PLAN_PRICES = {
  basic: { monthly: 50000, quarterly: 120000 },
  advanced: { monthly: 100000, quarterly: 250000 },
};

const PLAN_DURATIONS = {
  monthly: 30,
  quarterly: 90,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Create payment request
    if (req.method === "POST" && action === "create") {
      const { telegram_id, plan, duration } = await req.json();

      if (!telegram_id || !plan || !duration) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user by telegram_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_id", telegram_id)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const amount = PLAN_PRICES[plan as keyof typeof PLAN_PRICES]?.[duration as keyof typeof PLAN_DURATIONS];
      if (!amount) {
        return new Response(
          JSON.stringify({ error: "Invalid plan or duration" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create Zarinpal payment request
      const zarinpalResponse = await fetch("https://api.zarinpal.com/pg/v4/payment/request.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: ZARINPAL_MERCHANT_ID,
          amount: amount * 10, // Convert Toman to Rial
          callback_url: `${SUPABASE_URL}/functions/v1/zarinpal-payment?action=verify`,
          description: `خرید اشتراک ${plan === "basic" ? "پایه" : "پیشرفته"} - ${duration === "monthly" ? "ماهانه" : "سه ماهه"}`,
          metadata: {
            telegram_id,
            plan,
            duration,
          },
        }),
      });

      const zarinpalData = await zarinpalResponse.json();

      if (zarinpalData.data?.code !== 100) {
        console.error("Zarinpal error:", zarinpalData);
        return new Response(
          JSON.stringify({ error: "Payment gateway error", details: zarinpalData.errors }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const authority = zarinpalData.data.authority;

      // Log payment request
      await supabase.from("payment_logs").insert({
        user_id: profile.id,
        authority,
        amount,
        plan,
        duration,
        status: "pending",
      });

      return new Response(
        JSON.stringify({
          success: true,
          payment_url: `https://www.zarinpal.com/pg/StartPay/${authority}`,
          authority,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify payment (callback from Zarinpal)
    if (req.method === "GET" && action === "verify") {
      const authority = url.searchParams.get("Authority");
      const status = url.searchParams.get("Status");

      if (status !== "OK" || !authority) {
        // Redirect to failure page
        return new Response(null, {
          status: 302,
          headers: { Location: "https://t.me/YOUR_BOT_USERNAME?start=payment_failed" },
        });
      }

      // Get payment log
      const { data: paymentLog, error: logError } = await supabase
        .from("payment_logs")
        .select("*")
        .eq("authority", authority)
        .single();

      if (logError || !paymentLog) {
        console.error("Payment log not found:", authority);
        return new Response(null, {
          status: 302,
          headers: { Location: "https://t.me/YOUR_BOT_USERNAME?start=payment_failed" },
        });
      }

      // Verify with Zarinpal
      const verifyResponse = await fetch("https://api.zarinpal.com/pg/v4/payment/verify.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: ZARINPAL_MERCHANT_ID,
          amount: paymentLog.amount * 10, // Rial
          authority,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.data?.code !== 100 && verifyData.data?.code !== 101) {
        // Payment failed
        await supabase
          .from("payment_logs")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("authority", authority);

        return new Response(null, {
          status: 302,
          headers: { Location: "https://t.me/YOUR_BOT_USERNAME?start=payment_failed" },
        });
      }

      // Payment successful
      const refId = verifyData.data.ref_id;
      const durationDays = PLAN_DURATIONS[paymentLog.duration as keyof typeof PLAN_DURATIONS];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // Update payment log
      await supabase
        .from("payment_logs")
        .update({ status: "success", ref_id: String(refId), updated_at: new Date().toISOString() })
        .eq("authority", authority);

      // Upsert subscription
      await supabase.from("subscriptions").upsert(
        {
          user_id: paymentLog.user_id,
          plan: paymentLog.plan,
          duration: paymentLog.duration,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true,
          daily_limit: 9999,
        },
        { onConflict: "user_id" }
      );

      // Redirect to success page
      return new Response(null, {
        status: 302,
        headers: { Location: `https://t.me/YOUR_BOT_USERNAME?start=payment_success_${refId}` },
      });
    }

    // Get user subscription status (for bot)
    if (req.method === "GET" && action === "status") {
      const telegram_id = url.searchParams.get("telegram_id");

      if (!telegram_id) {
        return new Response(
          JSON.stringify({ error: "Missing telegram_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_id", telegram_id)
        .single();

      if (!profile) {
        return new Response(
          JSON.stringify({ plan: "free", is_active: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", profile.id)
        .single();

      if (!subscription) {
        return new Response(
          JSON.stringify({ plan: "free", is_active: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isExpired = subscription.expires_at && new Date(subscription.expires_at) < new Date();

      return new Response(
        JSON.stringify({
          plan: isExpired ? "free" : subscription.plan,
          is_active: !isExpired && subscription.is_active,
          expires_at: subscription.expires_at,
          started_at: subscription.started_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in zarinpal-payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
