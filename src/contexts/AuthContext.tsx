import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface TelegramUserInfo {
  telegram_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Telegram user info extracted from initData (available before Supabase session) */
  telegramUser: TelegramUserInfo | null;
  /** Auth error message if Telegram auth failed */
  authError: string | null;
  /** Retry Telegram authentication */
  retryAuth: () => void;
  /** Email/password sign-in — only for admin panel */
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Detect if we are running inside a Telegram Mini App.
 */
function getTelegramInitData(): string | null {
  try {
    const initData = window.Telegram?.WebApp?.initData;
    return initData && initData.length > 0 ? initData : null;
  } catch {
    return null;
  }
}

/**
 * Parse unsafely to get display info while auth is in progress.
 */
function parseTelegramUser(): TelegramUserInfo | null {
  try {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser) return null;
    return {
      telegram_id: String(tgUser.id),
      display_name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || "کاربر",
      avatar_url: tgUser.photo_url ?? null,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [telegramUser, setTelegramUser] = useState<TelegramUserInfo | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const authenticateWithTelegram = useCallback(async (initData: string) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/telegram-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Set the session in Supabase client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      // Session will be picked up by onAuthStateChange listener
    } catch (err) {
      console.error("Telegram auth failed:", err);
      setAuthError(err instanceof Error ? err.message : "احراز هویت تلگرام ناموفق بود");
      setIsLoading(false);
    }
  }, []);

  const retryAuth = useCallback(() => {
    const initData = getTelegramInitData();
    if (initData) {
      authenticateWithTelegram(initData);
    }
  }, [authenticateWithTelegram]);

  // Initialize auth
  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession) {
        setIsLoading(false);
      }
    });

    const initAuth = async () => {
      // 1. Check for existing Supabase session
      const { data: { session: existingSession } } = await supabase.auth.getSession();

      if (existingSession) {
        setSession(existingSession);
        setUser(existingSession.user);
        setIsLoading(false);
        return;
      }

      // 2. Check for Telegram Mini App context
      const initData = getTelegramInitData();

      if (initData) {
        // Parse Telegram user info for immediate display
        setTelegramUser(parseTelegramUser());

        // Tell Telegram we're ready
        window.Telegram?.WebApp?.ready();
        window.Telegram?.WebApp?.expand();

        // Authenticate via edge function
        await authenticateWithTelegram(initData);
      } else {
        // Not in Telegram and no existing session — unauthenticated
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, [authenticateWithTelegram]);

  // Keep telegramUser in sync after session is established
  useEffect(() => {
    if (user && !telegramUser) {
      const meta = user.user_metadata;
      if (meta?.telegram_id) {
        setTelegramUser({
          telegram_id: meta.telegram_id,
          display_name: meta.display_name || "کاربر",
          avatar_url: meta.avatar_url || null,
        });
      }
    }
  }, [user, telegramUser]);

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setTelegramUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAuthenticated: !!session,
      telegramUser,
      authError,
      retryAuth,
      signInWithPassword,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
