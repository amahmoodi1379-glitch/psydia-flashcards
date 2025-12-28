import { AppLayout } from "@/components/layout/AppLayout";
import { User, Moon, Sun, BookOpen, TrendingUp, Target, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HierarchicalMasteryMap } from "@/components/profile/HierarchicalMasteryMap";
import { ActivitySparkline } from "@/components/profile/ActivitySparkline";
import { ExtendedActivityChart } from "@/components/profile/ExtendedActivityChart";
import { SubjectProgress } from "@/components/profile/SubjectProgress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileStats } from "@/hooks/useProfileStats";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";

const toPersianNumber = (num: number): string => {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, isLoading } = useProfileStats();
  const { resolvedTheme, setTheme } = useTheme();
  const { hasFeature } = useSubscription();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };


  const canViewMasteryMap = hasFeature("mastery_map");
  const canViewExtendedActivity = hasFeature("extended_activity");

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
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              {resolvedTheme === "dark" ? (
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

        {/* Mastery Map - Hierarchical for advanced users */}
        <div 
          className="mb-6 animate-fade-in" 
          style={{ animationDelay: "0.15s" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">نقشه تسلط</h2>
          </div>
          {canViewMasteryMap ? (
            <HierarchicalMasteryMap />
          ) : (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="p-6 text-center">
                <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  نقشه تسلط سلسله‌مراتبی مخصوص اشتراک پیشرفته است
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate("/subscription")}>
                  ارتقای اشتراک
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Activity Section */}
        <div 
          className="mb-6 animate-fade-in" 
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">
              {canViewExtendedActivity ? "گزارش فعالیت" : "فعالیت ۷ روز اخیر"}
            </h2>
          </div>
          {canViewExtendedActivity ? (
            <ExtendedActivityChart />
          ) : (
            <>
              <ActivitySparkline />
              <Card className="mt-3 border-dashed border-2 border-muted">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-2">
                    برای مشاهده آمار ماهانه، ۳ ماهه، ۶ ماهه و سالانه
                  </p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/subscription")}>
                    ارتقای اشتراک
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
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