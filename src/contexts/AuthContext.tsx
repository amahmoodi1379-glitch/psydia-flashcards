import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  telegramUser: TelegramUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authAttempted, setAuthAttempted] = useState(false);

  // Initialize Telegram auth
  useEffect(() => {
    const initTelegramAuth = async () => {
      // Check for existing session first
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (existingSession) {
        setSession(existingSession);
        setUser(existingSession.user);
        setIsLoading(false);
        return;
      }

      // If no session and we're in Telegram, authenticate
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData;

      if (initData && initData.length > 0) {
        try {
          console.log('Authenticating with Telegram...');
          
          const { data, error } = await supabase.functions.invoke('telegram-auth', {
            body: { initData }
          });

          if (error) {
            console.error('Telegram auth error:', error);
            setIsLoading(false);
            setAuthAttempted(true);
            return;
          }

          if (data?.session) {
            // Set the session in Supabase client
            await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });
            
            setSession(data.session);
            setUser(data.user);
            setTelegramUser(data.telegramUser);
          }
        } catch (err) {
          console.error('Telegram auth failed:', err);
        }
      }

      setIsLoading(false);
      setAuthAttempted(true);
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          setTelegramUser(null);
        }
      }
    );

    // Small delay to ensure Telegram SDK is loaded
    const timer = setTimeout(initTelegramAuth, 150);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setTelegramUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      telegramUser,
      isLoading, 
      isAuthenticated: !!session,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
