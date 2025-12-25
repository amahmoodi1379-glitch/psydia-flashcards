import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, BookOpen, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signIn, signUp } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("ایمیل یا رمز عبور اشتباه است");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("خوش آمدید!");
          navigate("/");
        }
      } else {
        if (!displayName.trim()) {
          toast.error("لطفاً نام نمایشی را وارد کنید");
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          toast.error("رمز عبور باید حداقل ۶ کاراکتر باشد");
          setIsSubmitting(false);
          return;
        }
        
        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("این ایمیل قبلاً ثبت شده است");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("ثبت‌نام موفق! لطفاً ایمیل خود را تأیید کنید.");
        }
      }
    } catch (err) {
      toast.error("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Logo */}
      <div className="mb-8 text-center animate-fade-in">
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">روان‌یار</h1>
        <p className="text-muted-foreground text-sm mt-1">دستیار هوشمند روانشناسی</p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-sm bg-card rounded-2xl p-6 border border-border shadow-lg animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <h2 className="text-xl font-semibold text-foreground text-center mb-6">
          {isLogin ? "ورود به حساب" : "ثبت‌نام"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="displayName">نام نمایشی</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="مثلاً: علی"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-right"
                dir="rtl"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-left"
              dir="ltr"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">رمز عبور</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="حداقل ۶ کاراکتر"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-left pl-10"
                dir="ltr"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLogin ? (
              "ورود"
            ) : (
              "ثبت‌نام"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline"
          >
            {isLogin ? "حساب ندارید؟ ثبت‌نام کنید" : "حساب دارید؟ وارد شوید"}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center max-w-xs">
        برای ذخیره پیشرفت و آمار خود، وارد شوید
      </p>
    </div>
  );
}
