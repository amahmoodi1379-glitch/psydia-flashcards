import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

async function createHmacSha256(key: ArrayBuffer, data: ArrayBuffer): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, data);
}

async function validateTelegramData(initData: string, botToken: string): Promise<TelegramUser | null> {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      console.log('No hash found in initData');
      return null;
    }
    
    // Remove hash from params and sort
    urlParams.delete('hash');
    const dataCheckArr: string[] = [];
    
    urlParams.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');
    
    const encoder = new TextEncoder();
    
    // Create secret key: HMAC-SHA256("WebAppData", botToken)
    const webAppDataBuffer = encoder.encode('WebAppData').buffer as ArrayBuffer;
    const botTokenBuffer = encoder.encode(botToken).buffer as ArrayBuffer;
    const secretKey = await createHmacSha256(webAppDataBuffer, botTokenBuffer);
    
    // Calculate hash: HMAC-SHA256(secretKey, dataCheckString)
    const dataCheckBuffer = encoder.encode(dataCheckString).buffer as ArrayBuffer;
    const calculatedHashBuffer = await createHmacSha256(secretKey, dataCheckBuffer);
    
    const calculatedHashHex = Array.from(new Uint8Array(calculatedHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    if (calculatedHashHex !== hash) {
      console.log('Hash mismatch');
      return null;
    }
    
    // Parse user data
    const userStr = urlParams.get('user');
    if (!userStr) {
      console.log('No user data found');
      return null;
    }
    
    const user = JSON.parse(userStr) as TelegramUser;
    console.log('Validated telegram user:', user.id);
    return user;
  } catch (error) {
    console.error('Validation error:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData } = await req.json();
    
    if (!initData) {
      console.log('No initData provided');
      return new Response(
        JSON.stringify({ error: 'initData is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate Telegram initData
    const telegramUser = await validateTelegramData(initData, botToken);
    
    if (!telegramUser) {
      console.log('Invalid initData');
      return new Response(
        JSON.stringify({ error: 'Invalid Telegram data' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const telegramId = telegramUser.id.toString();
    const displayName = [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ');
    const email = `tg_${telegramId}@telegram.local`;
    // Create a deterministic password from telegram_id + partial bot token
    const password = `tg_secure_${telegramId}_${botToken.slice(-10)}`;

    // Check if user exists by telegram_id in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.id;
      console.log('Existing user found:', userId);
    } else {
      // Create new user
      console.log('Creating new user for telegram_id:', telegramId);
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          display_name: displayName,
        }
      });

      if (createError) {
        // User might exist in auth but not linked in profiles
        console.log('Create user error:', createError.message);
        
        // Try to find existing auth user by email
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const existingAuthUser = authUsers?.users?.find(u => u.email === email);
        
        if (existingAuthUser) {
          userId = existingAuthUser.id;
          // Update profile with telegram_id
          await supabase
            .from('profiles')
            .update({ telegram_id: telegramId, display_name: displayName })
            .eq('id', userId);
        } else {
          throw createError;
        }
      } else {
        userId = newUser.user.id;
        
        // Update profile with telegram_id
        await supabase
          .from('profiles')
          .update({ 
            telegram_id: telegramId, 
            display_name: displayName,
            avatar_url: telegramUser.photo_url || null
          })
          .eq('id', userId);
      }
    }

    // Sign in with password to get a valid session
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    const anonClient = createClient(supabaseUrl, anonKey!);
    
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: email,
      password: password,
    });
    
    if (signInError) {
      console.error('Sign in error:', signInError);
      
      // If sign in fails, try updating the password
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: password,
      });
      
      if (updateError) {
        console.error('Password update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Authentication failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Try signing in again
      const { data: retryData, error: retryError } = await anonClient.auth.signInWithPassword({
        email: email,
        password: password,
      });
      
      if (retryError) {
        console.error('Retry sign in error:', retryError);
        return new Response(
          JSON.stringify({ error: 'Authentication failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({
          session: retryData.session,
          user: retryData.user,
          telegramUser: telegramUser
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User signed in successfully:', userId);
    
    return new Response(
      JSON.stringify({
        session: signInData.session,
        user: signInData.user,
        telegramUser: telegramUser
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Server error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
