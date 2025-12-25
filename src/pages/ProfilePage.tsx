import { AppLayout } from "@/components/layout/AppLayout";
import { User, Moon, Sun, BookOpen, TrendingUp, Target, LogIn, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MasteryHeatmap } from "@/components/profile/MasteryHeatmap";
import { ActivitySparkline } from "@/components/profile/ActivitySparkline";
import { SubjectProgress } from "@/components/profile/SubjectProgress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileStats } from "@/hooks/useProfileStats";

const toPersianNumber = (num: number): string => {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { stats, isLoading } = useProfileStats();
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Check initial dark mode state
    setIsDarkMode(document.body.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle("dark");
  };

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate("/auth");
    }
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
        {/* Profile Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {isLoading ? "..." : stats.displayName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {user ? "دانشجوی روانشناسی" : "کاربر مهمان"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Auth Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAuthAction}
              className="w-12 h-12 rounded-xl"
            >
              {user ? (
                <LogOut className="w-5 h-5 text-destructive" />
              ) : (
                <LogIn className="w-5 h-5 text-primary" />
              )}
            </Button>
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-accent" />
              ) : (
                <Moon className="w-5 h-5 text-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div 
          className="grid grid-cols-3 gap-3 mb-6 animate-fade-in" 
          style={{ animationDelay: "0.1s" }}
        >
          <div className="bg-card rounded-xl p-4 text-center border border-border">
            <p className="text-2xl font-bold text-foreground">
              {isLoading ? "..." : toPersianNumber(stats.totalAnswered)}
            </p>
            <p className="text-xs text-muted-foreground">سوال پاسخ داده</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center border border-border">
            <p className="text-2xl font-bold text-foreground">
              {isLoading ? "..." : toPersianNumber(stats.accuracy)}٪
            </p>
            <p className="text-xs text-muted-foreground">دقت کلی</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center border border-border">
            <p className="text-2xl font-bold text-foreground">
              {isLoading ? "..." : toPersianNumber(stats.streak)}
            </p>
            <p className="text-xs text-muted-foreground">روز متوالی</p>
          </div>
        </div>

        {/* Mastery Heatmap */}
        <div 
          className="mb-6 animate-fade-in" 
          style={{ animationDelay: "0.15s" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">نقشه تسلط</h2>
          </div>
          <MasteryHeatmap />
        </div>

        {/* Activity Sparkline */}
        <div 
          className="mb-6 animate-fade-in" 
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">فعالیت ۷ روز اخیر</h2>
          </div>
          <ActivitySparkline />
        </div>

        {/* Subject Mastery */}
        <div 
          className="animate-fade-in" 
          style={{ animationDelay: "0.25s" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">پیشرفت دروس</h2>
          </div>
          <SubjectProgress />
        </div>
      </div>
    </AppLayout>
  );
}
