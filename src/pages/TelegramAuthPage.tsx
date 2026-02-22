import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
      };
    };
  }
}

const TelegramAuthPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, signInWithTelegram } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleTelegramLogin = async () => {
    const initData = window.Telegram?.WebApp?.initData;

    if (!initData) {
      toast.error('ورود تلگرام فقط داخل WebApp تلگرام در دسترس است.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await signInWithTelegram(initData);
      if (error) {
        toast.error(error);
        return;
      }

      toast.success('ورود تلگرام با موفقیت انجام شد');
      navigate('/', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
      <div className="w-full max-w-md bg-card border rounded-lg p-6 space-y-4 text-center">
        <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit">
          <Send className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold">ورود با تلگرام</h1>
        <p className="text-muted-foreground text-sm">
          اگر داخل تلگرام هستید، دکمه زیر را بزنید. در غیر این صورت از ورود عادی استفاده کنید.
        </p>

        <Button onClick={handleTelegramLogin} className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ورود با تلگرام'}
        </Button>

        <Button asChild variant="link" className="w-full">
          <Link to="/login">ورود با ایمیل/رمز عبور</Link>
        </Button>
      </div>
    </div>
  );
};

export default TelegramAuthPage;
