import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PlayCircle, BookOpen, Box, Star, Lock, AlertCircle } from "lucide-react";
import { cn, toPersianNumber } from "@/lib/utils";
import { SubjectSelector } from "@/components/exam/SubjectSelector";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useFrequentlyWrong } from "@/hooks/useFrequentlyWrong";
import { useSubscription } from "@/hooks/useSubscription";
import { useLeitnerDueCount } from "@/hooks/useLeitnerDueCount";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { 
  DailyReviewSkeleton, 
  ReviewCardSkeleton, 
} from "@/components/skeleton/ExamPageSkeleton";

export default function ExamPage() {
  const navigate = useNavigate();
  const { dueCount, totalInLeitner, isLoading: leitnerLoading } = useLeitnerDueCount();
  const { bookmarkCount, isLoading: bookmarksLoading } = useBookmarks();
  const { wrongCount, isLoading: wrongLoading } = useFrequentlyWrong();
  const { hasFeature, isLoading: subscriptionLoading } = useSubscription();
  
  const canBookmark = hasFeature("bookmarks");
  const canWrongReview = hasFeature("wrong_review");

  const handleStartLeitnerReview = () => {
    navigate("/review");
  };

  const handleStartBookmarksReview = () => {
    navigate("/review", { 
      state: { 
        filter: { type: "bookmarks" },
        title: "مرور نشان‌شده‌ها"
      } 
    });
  };

  const handleStartWrongReview = () => {
    navigate("/review", { 
      state: { 
        filter: { type: "frequently_wrong" },
        title: "مرور سوالات پراشتباه"
      } 
    });
  };

  const isInitialLoading = leitnerLoading;

  return (
    <AppLayout>
      {/* Onboarding Modal */}
      <OnboardingModal />
      
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

        {/* Leitner Review Section */}
        <section 
          className="mb-6 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
            {isInitialLoading ? (
              <DailyReviewSkeleton />
            ) : (
              <div className="bg-card rounded-2xl p-5 border border-border">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Box className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-foreground mb-1">
                      مرور لایتنر
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      سوالاتی که به لایتنر اضافه کرده‌اید و نوبت مرورشان رسیده
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-warning">
                      {toPersianNumber(dueCount)}
                    </p>
                    <p className="text-xs text-muted-foreground">نیازمند مرور</p>
                  </div>
                  <div className="flex-1 bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {toPersianNumber(totalInLeitner)}
                    </p>
                    <p className="text-xs text-muted-foreground">کل در لایتنر</p>
                  </div>
                </div>

                {/* Start Button */}
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleStartLeitnerReview}
                  disabled={dueCount === 0}
                >
                  <PlayCircle className="w-5 h-5" />
                  {dueCount > 0 ? "شروع مرور لایتنر" : "سوالی برای مرور نیست"}
                </Button>

                {totalInLeitner === 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    از بخش دروس، سوالات را به لایتنر اضافه کنید
                  </p>
                )}
              </div>
            )}
        </section>

        {/* Bookmarks Review Section - Only for advanced users */}
        <section 
          className="mb-4 animate-fade-in"
          style={{ animationDelay: "0.12s" }}
        >
            {bookmarksLoading || subscriptionLoading ? (
              <ReviewCardSkeleton />
            ) : (
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
            )}
        </section>

        {/* Frequently Wrong Questions Section - Only for advanced users */}
        <section 
          className="mb-6 animate-fade-in"
          style={{ animationDelay: "0.14s" }}
        >
            {wrongLoading || subscriptionLoading ? (
              <ReviewCardSkeleton />
            ) : (
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
            )}
        </section>

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
          
          <SubjectSelector />
        </section>
      </div>
    </AppLayout>
  );
}
