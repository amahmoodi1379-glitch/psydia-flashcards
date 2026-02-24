import { useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Star, Flag, Lock, Box } from "lucide-react";
import { cn, toPersianNumber, shuffleChoices } from "@/lib/utils";
import { useLeitnerReview } from "@/hooks/useLeitnerReview";
import { useReviewQuestions, ReviewFilter } from "@/hooks/useReviewQuestions";
import { useRecordAnswer } from "@/hooks/useRecordAnswer";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useSubscription } from "@/hooks/useSubscription";
import { ReviewPageSkeleton } from "@/components/skeleton/ReviewPageSkeleton";
import { useReportQuestion } from "@/hooks/useReportQuestion";
import { useLeitnerToggle } from "@/hooks/useLeitnerToggle";
import { toast } from "sonner";

export default function ReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Determine review mode: leitner (default) or bookmarks/frequently_wrong
  const stateFilter: ReviewFilter | undefined = location.state?.filter;
  const sessionTitle = location.state?.title ?? "مرور لایتنر";
  const isSpecialFilter = stateFilter?.type === "bookmarks" || stateFilter?.type === "frequently_wrong";

  // Fetch questions based on mode
  const leitnerResult = useLeitnerReview(20);
  const specialResult = useReviewQuestions(20, stateFilter ?? { type: "bookmarks" }, isSpecialFilter);

  const questions = isSpecialFilter ? specialResult.questions : leitnerResult.questions;
  const isLoading = isSpecialFilter ? specialResult.isLoading : leitnerResult.isLoading;
  const error = isSpecialFilter ? specialResult.error : leitnerResult.error;

  const { recordAnswer } = useRecordAnswer();
  const { toggleBookmark, isBookmarked: checkIsBookmarked } = useBookmarks();
  const { hasFeature, refetch: refetchSubscription } = useSubscription();
  const { reportQuestion, isReporting } = useReportQuestion();
  const { toggleLeitner, isToggling } = useLeitnerToggle();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    correctIndex: number;
    explanation?: string;
  } | undefined>();
  const answerRequestIdsRef = useRef<Map<string, string>>(new Map());
  const [leitnerState, setLeitnerState] = useState<Map<string, boolean>>(new Map());

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isBookmarked = currentQuestion ? checkIsBookmarked(currentQuestion.id) : false;
  const canBookmark = hasFeature("bookmarks");

  // Precompute shuffled choices
  const shuffledData = useMemo(() => {
    const map = new Map<string, { shuffled: string[]; indexMap: number[] }>();
    for (const q of questions) {
      map.set(q.id, shuffleChoices(q.choices, q.id));
    }
    return map;
  }, [questions]);

  const handleAnswer = async (selectedShuffledIndex: number, correct: boolean, correctShuffledIndex: number, explanation?: string) => {
    if (!currentQuestion || answeredQuestions.has(currentQuestion.id)) return;

    const existingRequestId = answerRequestIdsRef.current.get(currentQuestion.id);
    const requestId = existingRequestId ?? crypto.randomUUID();
    answerRequestIdsRef.current.set(currentQuestion.id, requestId);

    // Map shuffled index back to original (-1 means "don't know")
    const shuffle = shuffledData.get(currentQuestion.id);
    const originalSelectedIndex = selectedShuffledIndex === -1
      ? -1
      : (shuffle ? shuffle.indexMap[selectedShuffledIndex] : selectedShuffledIndex);

    try {
      const result = await recordAnswer(currentQuestion.id, originalSelectedIndex, correct, {
        clientRequestId: requestId,
      });

      if (!result.quotaAllowed) {
        toast.error("سهمیه روزانه شما تمام شده است. برای ادامه، اشتراک تهیه کنید.");
        navigate("/subscription");
        return;
      }

      setHasAnswered(true);
      setAnswerResult({
        isCorrect: correct,
        correctIndex: correctShuffledIndex,
        explanation,
      });

      if (correct) {
        setCorrectCount((prev) => prev + 1);
      }

      setAnsweredQuestions((prev) => new Set(prev).add(currentQuestion.id));
      // record_answer creates/updates user_question_state, so question is now in Leitner
      setLeitnerState((prev) => new Map(prev).set(currentQuestion.id, true));
      await Promise.all([
        refetchSubscription(),
        queryClient.invalidateQueries({ queryKey: ["leitner-due-count"] }),
      ]);
    } catch (recordError) {
      const message =
        recordError instanceof Error
          ? recordError.message
          : "ذخیره پاسخ انجام نشد. لطفاً دوباره تلاش کنید.";
      toast.error(`${message} شما می‌توانید همین سوال را دوباره پاسخ دهید.`);

      setHasAnswered(false);
      setAnswerResult(undefined);
    }
  };

  const handleToggleLeitner = async () => {
    if (!currentQuestion) return;
    try {
      const result = await toggleLeitner(currentQuestion.id);
      setLeitnerState((prev) => new Map(prev).set(currentQuestion.id, result.is_in_leitner));
    } catch {
      // Error toast handled by hook
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex >= totalQuestions - 1) {
      setIsComplete(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setHasAnswered(false);
      setAnswerResult(undefined);
    }
  };

  const handleGoBack = () => {
    if (answeredQuestions.size > 0 && !isComplete && currentIndex < totalQuestions - 1) {
      if (!confirm("جلسه مرور هنوز تمام نشده. آیا مطمئنید می‌خواهید خارج شوید؟")) {
        return;
      }
    }
    navigate("/");
  };

  const handleToggleBookmark = () => {
    if (!currentQuestion) return;
    
    if (!canBookmark) {
      toast.error("برای استفاده از نشان‌گذاری، پلن پیشرفته تهیه کنید");
      return;
    }
    
    toggleBookmark(currentQuestion.id);
  };

  const handleReport = () => {
    if (!currentQuestion || isReporting) return;
    reportQuestion(currentQuestion.id);
  };

  // Loading state with skeleton
  if (isLoading) {
    return (
      <AppLayout hideNav>
        <ReviewPageSkeleton />
      </AppLayout>
    );
  }

  // Error state
  if (error || questions.length === 0) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <p className="text-destructive mb-4">{error || "سوالی برای مرور یافت نشد"}</p>
          <Button variant="outline" onClick={handleGoBack}>
            بازگشت
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Complete state
  if (isComplete) {
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
            <Trophy className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            آفرین! 🎉
          </h2>
          <p className="text-muted-foreground text-center mb-4">
            جلسه مرور را با موفقیت تمام کردید.
          </p>
          
          {/* Stats */}
          <div className="bg-card rounded-2xl p-6 border border-border mb-8 w-full max-w-xs">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary mb-1">
                {toPersianNumber(percentage)}٪
              </p>
              <p className="text-sm text-muted-foreground">
                {toPersianNumber(correctCount)} از {toPersianNumber(totalQuestions)} صحیح
              </p>
            </div>
          </div>
          
          <Button variant="hero" size="lg" onClick={handleGoBack}>
            بازگشت به خانه
          </Button>
        </div>
      </AppLayout>
    );
  }

  const currentShuffle = currentQuestion ? shuffledData.get(currentQuestion.id) : undefined;

  return (
    <AppLayout hideNav>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-lg">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">{sessionTitle}</p>
            <p className="text-sm font-medium text-foreground">
              سوال {toPersianNumber(currentIndex + 1)} از {toPersianNumber(totalQuestions)}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleToggleBookmark}
              className={cn(
                isBookmarked && canBookmark && "text-accent",
                !canBookmark && "opacity-50"
              )}
            >
              {canBookmark ? (
                <Star className={cn("w-5 h-5", isBookmarked && "fill-current")} />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleReport}>
              <Flag className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col px-4 py-6 overflow-y-auto">
          {currentQuestion && currentShuffle && (
            <QuestionCard
              key={currentQuestion.id}
              questionId={currentQuestion.id}
              question={currentQuestion.stem_text}
              choices={currentShuffle.shuffled}
              indexMap={currentShuffle.indexMap}
              onAnswer={handleAnswer}
              hasAnswered={hasAnswered}
              answerResult={answerResult}
            />
          )}
        </div>

        {/* Leitner Toggle + Next Button - Only visible after answering */}
        {hasAnswered && (
          <div className="px-4 pb-6 animate-slide-up space-y-3">
            {currentQuestion && (() => {
              const isInLeitner = leitnerState.get(currentQuestion.id) ?? true;
              return (
                <button
                  onClick={handleToggleLeitner}
                  disabled={isToggling}
                  className={cn(
                    "w-full p-3 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2",
                    isInLeitner
                      ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                      : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary"
                  )}
                >
                  <Box className="w-5 h-5" />
                  <span className="font-medium text-sm">
                    {isInLeitner ? "در لایتنر است (حذف)" : "افزودن به لایتنر"}
                  </span>
                </button>
              );
            })()}
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={handleNextQuestion}
            >
              {currentIndex >= totalQuestions - 1 ? "پایان جلسه" : "سوال بعدی"}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
