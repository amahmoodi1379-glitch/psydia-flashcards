import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PlayCircle, RotateCcw, Clock, BookOpen, Loader2, Star, Lock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDueCount } from "@/hooks/useReviewQuestions";
import { SubjectSelector } from "@/components/exam/SubjectSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useFrequentlyWrong } from "@/hooks/useFrequentlyWrong";
import { useSubscription } from "@/hooks/useSubscription";

const toPersianNumber = (num: number): string => {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

const sessionSizes = [10, 20, 30];

export default function ExamPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessionSize, setSessionSize] = useState(20);
  const [hasActiveSession] = useState(false);
  const { dueCount, newCount, total, isLoading } = useDueCount();
  const { bookmarkCount } = useBookmarks();
  const { wrongCount } = useFrequentlyWrong();
  const { hasFeature } = useSubscription();
  const canBookmark = hasFeature("bookmarks");
  const canWrongReview = hasFeature("wrong_review");

  const handleStartDailyReview = () => {
    navigate("/review", { 
      state: { 
        sessionSize,
        filter: { type: "daily" },
        title: "مرور روزانه"
      } 
    });
  };

  const handleResumeSession = () => {
    navigate("/review", { state: { resume: true } });
  };

  const handleStartBookmarksReview = () => {
    navigate("/review", { 
      state: { 
        sessionSize: Math.min(sessionSize, bookmarkCount),
        filter: { type: "bookmarks" },
        title: "مرور نشان‌شده‌ها"
      } 
    });
  };

  const handleStartWrongReview = () => {
    navigate("/review", { 
      state: { 
        sessionSize: Math.min(sessionSize, wrongCount),
        filter: { type: "frequently_wrong" },
        title: "مرور سوالات پراشتباه"
      } 
    });
  };

  const reviewableCount = dueCount + newCount;

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
        {/* Header */}
        <header className="mb-6 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            برنامه امروز من
          </h1>
          <p className="text-muted-foreground">
            آماده تمرین هستید؟
          </p>
        </header>

        {/* Resume Card - Only visible if session is active */}
        {hasActiveSession && (
          <div 
            className="mb-4 animate-fade-in"
            style={{ animationDelay: "0.05s" }}
          >
            <button
              onClick={handleResumeSession}
              className="w-full bg-accent/10 border border-accent/30 rounded-2xl p-4 flex items-center gap-4 hover:bg-accent/20 transition-colors"
            >
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-accent" />
              </div>
              <div className="text-right flex-1">
                <p className="font-semibold text-foreground">ادامه آزمون قبلی</p>
                <p className="text-sm text-muted-foreground">
                  {toPersianNumber(5)} سوال باقی مانده
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Daily Review Section */}
        <section 
          className="mb-6 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="bg-card rounded-2xl p-5 border border-border">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                {isLoading ? (
                  <Loader2 className="w-7 h-7 text-primary animate-spin" />
                ) : (
                  <Clock className="w-7 h-7 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground mb-1">
                  مرور روزانه
                </h2>
                <p className="text-sm text-muted-foreground">
                  سوالات بر اساس سیستم SM2 فاصله‌دار
                </p>
              </div>
            </div>

            {/* Stats */}
            {!isLoading && user && (
              <div className="flex gap-3 mb-4">
                <div className="flex-1 bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-warning">
                    {toPersianNumber(dueCount)}
                  </p>
                  <p className="text-xs text-muted-foreground">نیازمند مرور</p>
                </div>
                <div className="flex-1 bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-success">
                    {toPersianNumber(newCount)}
                  </p>
                  <p className="text-xs text-muted-foreground">سوال جدید</p>
                </div>
              </div>
            )}

            {!isLoading && !user && (
              <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 mb-4">
                <p className="text-sm text-warning text-center">
                  برای ذخیره پیشرفت، وارد حساب شوید
                </p>
              </div>
            )}

            {/* Session Size Toggle */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                تعداد سوالات
              </p>
              <div className="flex gap-2">
                {sessionSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSessionSize(size)}
                    className={cn(
                      "flex-1 py-2 rounded-xl font-semibold text-sm transition-all duration-200",
                      sessionSize === size
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {toPersianNumber(size)}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <Button
              variant="hero"
              size="lg"
              className="w-full gap-2"
              onClick={handleStartDailyReview}
              disabled={(reviewableCount === 0 && !isLoading) || total === 0}
            >
              <PlayCircle className="w-5 h-5" />
              شروع مرور روزانه
            </Button>
          </div>
        </section>

        {/* Bookmarks Review Section - Only for advanced users */}
        {user && (
          <section 
            className="mb-4 animate-fade-in"
            style={{ animationDelay: "0.12s" }}
          >
            <div className={cn(
              "bg-card rounded-2xl p-5 border border-border",
              !canBookmark && "opacity-60"
            )}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                  {canBookmark ? (
                    <Star className="w-7 h-7 text-accent" />
                  ) : (
                    <Lock className="w-7 h-7 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-foreground mb-1">
                    سوالات نشان‌شده
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {canBookmark 
                      ? `${toPersianNumber(bookmarkCount)} سوال ذخیره شده`
                      : "ویژه پلن پیشرفته"
                    }
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2"
                onClick={handleStartBookmarksReview}
                disabled={!canBookmark || bookmarkCount === 0}
              >
                <Star className="w-5 h-5" />
                {canBookmark ? "مرور نشان‌شده‌ها" : "نیاز به پلن پیشرفته"}
              </Button>
            </div>
          </section>
        )}

        {/* Frequently Wrong Questions Section - Only for advanced users */}
        {user && (
          <section 
            className="mb-6 animate-fade-in"
            style={{ animationDelay: "0.14s" }}
          >
            <div className={cn(
              "bg-card rounded-2xl p-5 border border-border",
              !canWrongReview && "opacity-60"
            )}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-destructive/10 rounded-xl flex items-center justify-center shrink-0">
                  {canWrongReview ? (
                    <AlertCircle className="w-7 h-7 text-destructive" />
                  ) : (
                    <Lock className="w-7 h-7 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-foreground mb-1">
                    سوالات پراشتباه
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {canWrongReview 
                      ? `${toPersianNumber(wrongCount)} سوال با ۲+ اشتباه`
                      : "ویژه پلن پیشرفته"
                    }
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2"
                onClick={handleStartWrongReview}
                disabled={!canWrongReview || wrongCount === 0}
              >
                <AlertCircle className="w-5 h-5" />
                {canWrongReview ? "مرور پراشتباه‌ها" : "نیاز به پلن پیشرفته"}
              </Button>
            </div>
          </section>
        )}

        {/* Subject Selection Section */}
        <section 
          className="animate-fade-in"
          style={{ animationDelay: "0.16s" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground">
              مرور بر اساس درس
            </h2>
          </div>
          
          <SubjectSelector sessionSize={sessionSize} />
        </section>

        {/* Info Messages */}
        {!isLoading && total === 0 && (
          <div 
            className="mt-6 text-center animate-fade-in" 
            style={{ animationDelay: "0.2s" }}
          >
            <div className="bg-secondary/50 rounded-2xl p-6">
              <p className="text-sm text-muted-foreground">
                هیچ سوالی در پایگاه داده یافت نشد.
              </p>
            </div>
          </div>
        )}

        {!isLoading && total > 0 && (
          <div 
            className="mt-6 text-center animate-fade-in" 
            style={{ animationDelay: "0.2s" }}
          >
            <div className="bg-success/10 rounded-xl p-3 border border-success/20">
              <p className="text-xs text-success">
                ✓ {toPersianNumber(total)} سوال در دیتابیس
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}