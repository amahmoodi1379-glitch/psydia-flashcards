import { ReactNode, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw, AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // اگر این کامپوننت را نداری، از <input> معمولی کلاس‌دار استفاده کن
import { Label } from "@/components/ui/label"; // اگر این کامپوننت را نداری، از <label> معمولی استفاده کن
import { toast } from "sonner";

interface TelegramAuthGateProps {
  children: ReactNode;
}

export function TelegramAuthGate({ children }: TelegramAuthGateProps) {
  const { isLoading, isAuthenticated, authError, retryAuth, signInWithPassword } = useAuth();
  
  // --- شروع بخش دسترسی موقت (بعداً می‌توانید این استیت‌ها را پاک کنید) ---
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleWebLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("لطفاً ایمیل و رمز عبور را وارد کنید");
      return;
    }
    
    setIsLoggingIn(true);
    const { error } = await signInWithPassword(email, password);
    setIsLoggingIn(false);
    
    if (error) {
      toast.error("نام کاربری یا رمز عبور اشتباه است");
    } else {
      toast.success("با موفقیت وارد شدید");
    }
  };
  // --- پایان بخش دسترسی موقت ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4" dir="rtl">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">در حال ورود...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 gap-4" dir="rtl">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground">خطا در احراز هویت</h2>
        <p className="text-muted-foreground text-center text-sm max-w-xs">{authError}</p>
        <Button variant="outline" onClick={retryAuth} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          تلاش مجدد
        </Button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 gap-4" dir="rtl">
        
        {/* --- شروع فرم دسترسی موقت در UI --- */}
        {!showLogin ? (
          <>
            <div className="text-6xl mb-2">📱</div>
            <h2 className="text-lg font-bold text-foreground">مینی‌اپ تلگرام</h2>
            <p className="text-muted-foreground text-center text-sm max-w-xs mb-4">
              این برنامه فقط از طریق تلگرام قابل استفاده است.
            </p>
            {/* دکمه مخفی/موقت برای ورود ادمین یا کاربر خاص */}
            <Button variant="ghost" size="sm" onClick={() => setShowLogin(true)} className="opacity-50 hover:opacity-100 gap-2 mt-8">
              <KeyRound className="w-4 h-4" />
              دسترسی جایگزین
            </Button>
          </>
        ) : (
          <form onSubmit={handleWebLogin} className="w-full max-w-xs space-y-4 bg-card p-6 rounded-xl border shadow-sm">
            <h2 className="text-lg font-bold text-center mb-4">ورود به حساب</h2>
            <div className="space-y-2">
              <Label>ایمیل</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>رمز عبور</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : "ورود"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowLogin(false)}>
                انصراف
              </Button>
            </div>
          </form>
        )}
        {/* --- پایان فرم دسترسی موقت در UI --- */}

      </div>
    );
  }

  return <>{children}</>;
}
