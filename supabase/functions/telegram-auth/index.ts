import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

/** Convert a string to Uint8Array */
function encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** Convert ArrayBuffer to hex string */
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** HMAC-SHA256 using Web Crypto API */
async function hmacSha256(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encode(data));
}

/**
 * Validate Telegram initData using HMAC-SHA256.
 * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
async function validateInitData(initData: string, botToken: string): Promise<boolean> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  // Remove hash from params and sort alphabetically
  params.delete("hash");
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // secret_key = HMAC-SHA256("WebAppData", bot_token)
  const secretKey = await hmacSha256(encode("WebAppData"), botToken);
  // data_hash = HMAC-SHA256(secret_key, data_check_string)
  const dataHash = toHex(await hmacSha256(secretKey, dataCheckString));

  return dataHash === hash;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

function extractUser(initData: string): TelegramUser | null {
  const params = new URLSearchParams(initData);
  const userJson = params.get("user");
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: jsonHeaders },
    );
  }

  try {
    const body = await req.json();
    const initData: string | undefined = body.initData;

    if (!initData) {
      return new Response(
        JSON.stringify({ error: "Missing initData" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    if (!BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN is not configured");
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: jsonHeaders },
      );
    }

    // 1. Validate initData signature
    if (!(await validateInitData(initData, BOT_TOKEN))) {
      return new Response(
        JSON.stringify({ error: "Invalid initData signature" }),
        { status: 401, headers: jsonHeaders },
      );
    }

    // 2. Check auth_date is not too old (allow 5 minutes)
    const params = new URLSearchParams(initData);
    const authDate = Number(params.get("auth_date") || "0");
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) {
      return new Response(
        JSON.stringify({ error: "initData expired" }),
        { status: 401, headers: jsonHeaders },
      );
    }

    // 3. Extract user info
    const tgUser = extractUser(initData);
    if (!tgUser) {
      return new Response(
        JSON.stringify({ error: "No user in initData" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const telegramId = String(tgUser.id);
    const email = `tg_${telegramId}@telegram.psydia.app`;
    // Deterministic password: never exposed to client
    const password = toHex(await hmacSha256(encode(BOT_TOKEN), `psydia_user_${telegramId}`));
    const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || "کاربر";

    // 4. Try to sign in existing user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    let session = signInData?.session;

    // 5. If sign-in failed (user doesn't exist), create new user
    if (signInError) {
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          telegram_id: telegramId,
          avatar_url: tgUser.photo_url || null,
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user" }),
          { status: 500, headers: jsonHeaders },
        );
      }

      // Sign in the newly created user
      const { data: newSignIn, error: newSignInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (newSignInError || !newSignIn.session) {
        console.error("Error signing in new user:", newSignInError);
        return new Response(
          JSON.stringify({ error: "Failed to sign in new user" }),
          { status: 500, headers: jsonHeaders },
        );
      }

      session = newSignIn.session;

      // Update profile with telegram data (trigger creates basic profile)
      await supabase
        .from("profiles")
        .update({
          telegram_id: telegramId,
          display_name: displayName,
          avatar_url: tgUser.photo_url || null,
        })
        .eq("id", createData.user.id);
    } else {
      // 6. Existing user — update profile with latest Telegram info
      //    But preserve custom avatar if user chose one via AvatarSelector
      //    (custom avatars are stored as numeric index strings like "0", "3", etc.)
      if (session?.user) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", session.user.id)
          .single();

        const hasCustomAvatar = existingProfile?.avatar_url != null
          && /^\d+$/.test(existingProfile.avatar_url);

        const profileUpdate: Record<string, string> = {
          telegram_id: telegramId,
          display_name: displayName,
        };

        if (!hasCustomAvatar) {
          profileUpdate.avatar_url = tgUser.photo_url || "";
        }

        await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("id", session.user.id);
      }
    }

    if (!session) {
      return new Response(
        JSON.stringify({ error: "No session created" }),
        { status: 500, headers: jsonHeaders },
      );
    }

    return new Response(
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        user: {
          id: session.user.id,
          telegram_id: telegramId,
          display_name: displayName,
          avatar_url: tgUser.photo_url || null,
        },
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
