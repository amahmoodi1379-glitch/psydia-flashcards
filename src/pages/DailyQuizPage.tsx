import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Flame,
  Trophy,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn, toPersianNumber, shuffleChoices } from "@/lib/utils";
import { useDailyQuiz } from "@/hooks/useDailyQuiz";
import { hapticNotification, hapticImpact } from "@/lib/haptic";
import { Skeleton } from "@/components/ui/skeleton";

export default function DailyQuizPage() {
  const navigate = useNavigate();
  const {
    questions,
    isLoadingQuestions,
    questionsError,
    stats,
    isLoadingStats,
    submitQuiz,
    isSubmitting,
    submitResult,
  } = useDailyQuiz();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredSet, setAnsweredSet] = useState<Set<string>>(new Set());
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    correctIndex: number;
    explanation?: string;
  } | undefined>();
  const [showReview, setShowReview] = useState(false);
  const [answerHistory, setAnswerHistory] = useState<
    Map<string, { selectedIndex: number; correctIndex: number; isCorrect: boolean }>
  >(new Map());

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];

  // Precompute shuffled choices
  const shuffledData = useMemo(() => {
    const map = new Map<string, { shuffled: string[]; indexMap: number[] }>();
    for (const q of questions) {
      map.set(q.question_id, shuffleChoices(q.choices, q.question_id));
    }
    return map;
  }, [questions]);

  const handleAnswer = useCallback(
    (selectedShuffledIndex: number, correct: boolean, correctShuffledIndex: number, explanation?: string) => {
      if (!currentQuestion || answeredSet.has(currentQuestion.question_id)) return;

      setHasAnswered(true);
      setAnswerResult({ isCorrect: correct, correctIndex: correctShuffledIndex, explanation });

      if (correct) {
        setCorrectCount((prev) => prev + 1);
      }

      setAnsweredSet((prev) => new Set(prev).add(currentQuestion.question_id));
      setAnswerHistory((prev) => {
        const next = new Map(prev);
        next.set(currentQuestion.question_id, {
          selectedIndex: selectedShuffledIndex,
          correctIndex: correctShuffledIndex,
          isCorrect: correct,
        });
        return next;
      });
    },
    [currentQuestion, answeredSet]
  );

  const handleNextQuestion = async () => {
    if (currentIndex >= totalQuestions - 1) {
      // Quiz complete — submit
      const finalCorrect = correctCount + (answerResult?.isCorrect && !answeredSet.has(currentQuestion?.question_id ?? "") ? 1 : 0);
      setIsComplete(true);
      hapticNotification("success");
      try {
        await submitQuiz(finalCorrect > correctCount ? finalCorrect : correctCount);
      } catch {
        // Stats will refresh on next poll anyway
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
      setHasAnswered(false);
      setAnswerResult(undefined);
    }
  };

  const handleGoBack = () => {
    navigate("/");
  };

  // Already completed today — show results
  if (!isLoadingStats && stats?.has_completed && !isComplete && currentIndex === 0 && !hasAnswered) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-lg">
            <Button variant="ghost" size="icon" onClick={handleGoBack}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">آزمون روز</p>
            </div>
            <div className="w-10" />
          </header>

          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
            {/* Trophy Circle */}
            <div className="relative mb-8">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 via-accent/20 to-success/20 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-success rounded-full flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2">
              آزمون امروز انجام شد!
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              نتیجه شما ثبت شده و آمار به‌روز می‌شود
            </p>

            {/* Stats Card */}
            <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 mb-6 space-y-4">
              <div className="text-center">
                <p className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {toPersianNumber(stats.correct_count)}/{toPersianNumber(stats.total_count)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">پاسخ صحیح</p>
              </div>

              <div className="h-px bg-border" />

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <TrendingUp className="w-4 h-4 text-success" />
                    <span className="text-xl font-bold text-foreground">
                      {toPersianNumber(stats.percentile)}٪
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">بهتر از دیگران</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-xl font-bold text-foreground">
                      {toPersianNumber(stats.total_participants)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">شرکت‌کننده</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
              <Clock className="w-3.5 h-3.5" />
              <span>آمار هر ۲ دقیقه به‌روز می‌شود</span>
            </div>

            <Button variant="hero" size="lg" onClick={handleGoBack} className="w-full max-w-sm">
              بازگشت به خانه
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Loading state
  if (isLoadingQuestions || isLoadingStats) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-lg">
            <Button variant="ghost" size="icon" onClick={handleGoBack}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">آزمون روز</p>
            </div>
            <div className="w-10" />
          </header>
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
            <Skeleton className="w-full max-w-md h-32 rounded-2xl" />
            <Skeleton className="w-full max-w-md h-14 rounded-xl" />
            <Skeleton className="w-full max-w-md h-14 rounded-xl" />
            <Skeleton className="w-full max-w-md h-14 rounded-xl" />
            <Skeleton className="w-full max-w-md h-14 rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (questionsError || questions.length === 0) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <p className="text-destructive mb-4">{questionsError || "سوالی برای آزمون روز یافت نشد"}</p>
          <Button variant="outline" onClick={handleGoBack}>
            بازگشت
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Complete state — show results
  if (isComplete) {
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
          {/* Animated Trophy */}
          <div className="relative mb-8">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 via-accent/20 to-success/20 flex items-center justify-center animate-pulse">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Trophy className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">
            {percentage >= 80 ? "عالی بود! 🎉" : percentage >= 50 ? "خوب بود! 👏" : "ادامه بده! 💪"}
          </h2>
          <p className="text-muted-foreground text-center mb-6">
            آزمون روز تمام شد
          </p>

          {/* Score Card */}
          <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 mb-6 space-y-4">
            <div className="text-center">
              <p className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {toPersianNumber(correctCount)}/{toPersianNumber(totalQuestions)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">پاسخ صحیح ({toPersianNumber(percentage)}٪)</p>
            </div>

            <div className="h-px bg-border" />

            {/* Percentile */}
            {isSubmitting ? (
              <div className="flex items-center justify-center py-4 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">در حال محاسبه رتبه...</span>
              </div>
            ) : submitResult ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-4 text-center border border-success/20">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <TrendingUp className="w-5 h-5 text-success" />
                    <span className="text-2xl font-bold text-success">
                      {toPersianNumber(submitResult.percentile)}٪
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">بهتر از دیگران</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold text-foreground">
                      {toPersianNumber(submitResult.total_participants)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">شرکت‌کننده</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Review Answers Toggle */}
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full max-w-sm flex items-center justify-between p-4 bg-card rounded-xl border border-border mb-4 hover:bg-muted/50 transition-colors"
          >
            <span className="font-semibold text-foreground">مرور پاسخ‌ها</span>
            {showReview ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {/* Review List */}
          {showReview && (
            <div className="w-full max-w-sm space-y-3 mb-6 animate-fade-in">
              {questions.map((q, idx) => {
                const history = answerHistory.get(q.question_id);
                const shuffle = shuffledData.get(q.question_id);
                const choices = shuffle?.shuffled ?? q.choices;
                const correctIdx = history?.correctIndex ?? -1;
                const selectedIdx = history?.selectedIndex ?? -1;

                return (
                  <div key={q.question_id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        history?.isCorrect ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                      )}>
                        {toPersianNumber(idx + 1)}
                      </span>
                      <p className="text-sm font-medium text-foreground leading-relaxed">
                        {q.stem_text}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {choices.map((choice, cIdx) => (
                        <div
                          key={cIdx}
                          className={cn(
                            "text-xs px-3 py-2 rounded-lg",
                            cIdx === correctIdx && "bg-success/10 text-success font-medium",
                            cIdx === selectedIdx && cIdx !== correctIdx && "bg-destructive/10 text-destructive font-medium",
                            cIdx !== correctIdx && cIdx !== selectedIdx && "bg-secondary/50 text-muted-foreground"
                          )}
                        >
                          {choice}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Clock className="w-3.5 h-3.5" />
            <span>آمار هر ۲ دقیقه به‌روز می‌شود</span>
          </div>

          <Button variant="hero" size="lg" onClick={handleGoBack} className="w-full max-w-sm">
            بازگشت به خانه
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Active quiz state
  const currentShuffle = currentQuestion ? shuffledData.get(currentQuestion.question_id) : undefined;

  return (
    <AppLayout hideNav>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-lg">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>

          <div className="text-center">
            <div className="flex items-center gap-1.5 justify-center mb-0.5">
              <Flame className="w-4 h-4 text-accent" />
              <p className="text-xs text-accent font-semibold">آزمون روز</p>
            </div>
            <p className="text-sm font-medium text-foreground">
              سوال {toPersianNumber(currentIndex + 1)} از {toPersianNumber(totalQuestions)}
            </p>
          </div>

          <div className="w-10" />
        </header>

        {/* Progress Bar */}
        <div className="h-1.5 bg-secondary">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>

        {/* Free Badge */}
        <div className="px-4 pt-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/10 rounded-full border border-success/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span className="text-xs font-medium text-success">رایگان — بدون کسر سهمیه</span>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col px-4 py-4 overflow-y-auto">
          {currentQuestion && currentShuffle && (
            <QuestionCard
              key={currentQuestion.question_id}
              questionId={currentQuestion.question_id}
              question={currentQuestion.stem_text}
              choices={currentShuffle.shuffled}
              indexMap={currentShuffle.indexMap}
              onAnswer={handleAnswer}
              hasAnswered={hasAnswered}
              answerResult={answerResult}
            />
          )}
        </div>

        {/* Next Button — Only visible after answering */}
        {hasAnswered && (
          <div className="px-4 pb-6 animate-slide-up">
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={handleNextQuestion}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : currentIndex >= totalQuestions - 1 ? (
                "مشاهده نتایج"
              ) : (
                "سوال بعدی"
              )}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
