import { ReactNode, useState, useEffect } from 'react';
import { useTelegramCheck } from '@/hooks/useTelegramCheck';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TelegramGuardProps {
  children: ReactNode;
}

const AUTH_TIMEOUT_MS = 10000;

export function TelegramGuard({ children }: TelegramGuardProps) {
  const { isTelegram, isLoading: telegramLoading } = useTelegramCheck();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [authTimedOut, setAuthTimedOut] = useState(false);

  const isLoading = telegramLoading || authLoading;

  // Timeout for auth - if stuck loading for too long, show error
  useEffect(() => {
    if (!isTelegram || isAuthenticated) return;
    
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        setAuthTimedOut(true);
      }
    }, AUTH_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isTelegram, isAuthenticated]);

  const handleRetry = () => {
    setAuthTimedOut(false);
    window.location.reload();
  };

  if (isLoading && !authTimedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
      </div>
    );
  }

  if (!isTelegram) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center" dir="rtl">
        <div className="mb-8 p-6 rounded-full bg-primary/10">
          <Send className="h-16 w-16 text-primary" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-4">
          این اپلیکیشن فقط در تلگرام قابل استفاده است
        </h1>
        
        <p className="text-muted-foreground mb-8 max-w-md">
          برای استفاده از این برنامه، لطفاً از طریق ربات تلگرام وارد شوید.
        </p>
        
        <Button
          size="lg"
          className="gap-2"
          onClick={() => window.open('https://t.me/psydiabot', '_blank')}
        >
          <Send className="h-5 w-5" />
          ورود از طریق تلگرام
        </Button>
        
        <p className="text-sm text-muted-foreground mt-4">
          @psydiabot
        </p>
      </div>
    );
  }

  // Auth timed out - show error with retry
  if (authTimedOut || (!isAuthenticated && !authLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center" dir="rtl">
        <div className="mb-6 p-4 rounded-full bg-destructive/10">
          <RefreshCw className="h-12 w-12 text-destructive" />
        </div>
        
        <h2 className="text-xl font-bold text-foreground mb-2">
          خطا در احراز هویت
        </h2>
        
        <p className="text-muted-foreground mb-6 max-w-sm">
          لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، اپلیکیشن را ببندید و دوباره باز کنید.
        </p>
        
        <Button onClick={handleRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          تلاش مجدد
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
