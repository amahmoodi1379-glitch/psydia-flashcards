import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TelegramAuthGateProps {
  children: ReactNode;
}

/**
 * Wraps main app routes. Shows loading while Telegram auth is in progress,
 * or an error screen if auth failed. Passes through if authenticated.
 */
export function TelegramAuthGate({ children }: TelegramAuthGateProps) {
  const { isLoading, isAuthenticated, authError, retryAuth } = useAuth();

  // Loading state while authenticating
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4" dir="rtl">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">در حال ورود...</p>
      </div>
    );
  }

  // Auth error (Telegram auth failed)
  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 gap-4" dir="rtl">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground">خطا در احراز هویت</h2>
        <p className="text-muted-foreground text-center text-sm max-w-xs">
          {authError}
        </p>
        <Button variant="outline" onClick={retryAuth} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          تلاش مجدد
        </Button>
      </div>
    );
  }

  // Not authenticated and not in Telegram — show a message
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 gap-4" dir="rtl">
        <div className="text-6xl mb-2">📱</div>
        <h2 className="text-lg font-bold text-foreground">مینی‌اپ تلگرام</h2>
        <p className="text-muted-foreground text-center text-sm max-w-xs">
          این برنامه فقط از طریق تلگرام قابل استفاده است.
          لطفاً از طریق بات تلگرام وارد شوید.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
