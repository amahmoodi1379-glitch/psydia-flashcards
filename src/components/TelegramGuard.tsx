import { ReactNode } from 'react';
import { useTelegramCheck } from '@/hooks/useTelegramCheck';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TelegramGuardProps {
  children: ReactNode;
}

export function TelegramGuard({ children }: TelegramGuardProps) {
  const { isTelegram, isLoading: telegramLoading } = useTelegramCheck();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const isLoading = telegramLoading || authLoading;

  if (isLoading) {
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

  // Show loading while authenticating
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">در حال احراز هویت...</p>
      </div>
    );
  }

  return <>{children}</>;
}
