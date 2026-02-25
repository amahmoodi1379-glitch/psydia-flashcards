import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  Timer,
} from "lucide-react";
import { cn, toPersianNumber, shuffleChoices } from "@/lib/utils";
import { useDailyQuiz } from "@/hooks/useDailyQuiz";
import { hapticNotification } from "@/lib/haptic";
import { Skeleton } from "@/components/ui/skeleton";

const QUIZ_DURATION_SECONDS = 5 * 60; // 5 minutes

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${toPersianNumber(m)}:${toPersianNumber(s).padStart(2, "۰")}`;
}

export default function DailyQuizPage() {
  const navigate = useNavigate();
  const {
    questions,
    isLoadingQuestions,
    questionsError,
    stats,
    isLoadingStats,
    isRefreshingStats,
    statsError,
    submitQuiz,
    isSubmitting,
    submitResult,
  } = useDailyQuiz();

  const [isComplete, setIsComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredSet, setAnsweredSet] = useState<Set<string>>(new Set());
  const [answerResults, setAnswerResults] = useState<
    Map<string, { isCorrect: boolean; correctIndex: number; explanation?: string }>
  >(new Map());
  const [answerHistory, setAnswerHistory] = useState<
    Map<string, { selectedIndex: number; correctIndex: number; isCorrect: boolean }>
  >(new Map());

  // Timer state
  const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION_SECONDS);
  const [timerStarted, setTimerStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSubmittedRef = useRef(false);
  const quizStartedRef = useRef(false);

  const totalQuestions = questions.length;
  const allAnswered = totalQuestions > 0 && answeredSet.size >= totalQuestions;

  // Precompute shuffled choices
  const shuffledData = useMemo(() => {
    const map = new Map<string, { shuffled: string[]; indexMap: number[] }>();
    for (const q of questions) {
      map.set(q.question_id, shuffleChoices(q.choices, q.question_id));
    }
    return map;
  }, [questions]);

  // Start timer when questions load and quiz hasn't been completed
  useEffect(() => {
    if (questions.length > 0 && !stats?.has_completed && !timerStarted && !isComplete) {
      setTimerStarted(true);
    }
  }, [questions.length, stats?.has_completed, timerStarted, isComplete]);

  // Timer countdown
  useEffect(() => {
    if (!timerStarted || isComplete) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerStarted, isComplete]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !isComplete && !hasSubmittedRef.current) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const handleAnswer = useCallback(
    (questionId: string) =>
      (selectedShuffledIndex: number, correct: boolean, correctShuffledIndex: number, explanation?: string) => {
        if (answeredSet.has(questionId) || isComplete) return;

        if (correct) {
          setCorrectCount((prev) => prev + 1);
        }

        setAnsweredSet((prev) => new Set(prev).add(questionId));
        setAnswerResults((prev) => {
          const next = new Map(prev);
          next.set(questionId, { isCorrect: correct, correctIndex: correctShuffledIndex, explanation });
          return next;
        });
        setAnswerHistory((prev) => {
          const next = new Map(prev);
          next.set(questionId, {
            selectedIndex: selectedShuffledIndex,
            correctIndex: correctShuffledIndex,
            isCorrect: correct,
          });
          return next;
        });
      },
    [answeredSet, isComplete]
  );

  const handleSubmit = async () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsComplete(true);
    hapticNotification("success");

    try {
      await submitQuiz(correctCount);
    } catch {
      // Stats will refresh on next poll anyway
    }
  };

  const handleGoBack = () => {
    navigate("/");
  };

  // ─── GATE 1: Loading ───
  // When page first mounts and stats are refreshing (stale cache), wait for fresh data
  // so we get the true has_completed value. Once quiz is started, don't block on refreshes.
  const waitingForFreshStats = !quizStartedRef.current && isRefreshingStats && !stats?.has_completed;
  console.log("[DailyQuiz Page] Gate check:", {
    isLoadingQuestions, isLoadingStats, isRefreshingStats, waitingForFreshStats,
    statsHasCompleted: stats?.has_completed, statsError: !!statsError,
    isComplete, quizStarted: quizStartedRef.current,
  });
  if (isLoadingQuestions || isLoadingStats || waitingForFreshStats) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col">
          <DailyQuizHeader onBack={handleGoBack} />
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
            <Skeleton className="w-full max-w-md h-32 rounded-2xl" />
            <Skeleton className="w-full max-w-md h-14 rounded-xl" />
            <Skeleton className="w-full max-w-md h-14 rounded-xl" />
            <Skeleton className="w-full max-w-md h-14 rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // ─── GATE 2: Already completed today (from server) ───
  if (stats?.has_completed) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col">
          <DailyQuizHeader onBack={handleGoBack} />
          <CompletedView
            correctCount={stats.correct_count}
            totalCount={stats.total_count}
            percentile={stats.percentile}
            totalParticipants={stats.total_participants}
            onBack={handleGoBack}
          />
        </div>
      </AppLayout>
    );
  }

  // ─── GATE 3: Error / no questions ───
  if (statsError || questionsError || questions.length === 0) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <p className="text-destructive mb-4">{questionsError || (statsError ? "خطا در بارگذاری آمار آزمون روز" : "سوالی برای آزمون روز یافت نشد")}</p>
          <Button variant="outline" onClick={handleGoBack}>بازگشت</Button>
        </div>
      </AppLayout>
    );
  }

  // ─── GATE 4: Just completed (local) ───
  if (isComplete) {
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col">
          <DailyQuizHeader onBack={handleGoBack} />
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center p-6 animate-fade-in">
              {/* Trophy */}
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 via-accent/20 to-success/20 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-1">
                {percentage >= 80 ? "عالی بود! 🎉" : percentage >= 50 ? "خوب بود! 👏" : "ادامه بده! 💪"}
              </h2>
              <p className="text-muted-foreground text-center mb-6">آزمون روز تمام شد</p>

              {/* Score Card */}
              <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 mb-6 space-y-4">
                <div className="text-center">
                  <p className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {toPersianNumber(correctCount)}/{toPersianNumber(totalQuestions)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">پاسخ صحیح ({toPersianNumber(percentage)}٪)</p>
                </div>
                <div className="h-px bg-border" />

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

              {/* Review Answers */}
              <div className="w-full max-w-sm mb-6">
                <h3 className="font-semibold text-foreground mb-3">مرور پاسخ‌ها</h3>
                <div className="space-y-3">
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
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                            history?.isCorrect ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                          )}>
                            {toPersianNumber(idx + 1)}
                          </span>
                          <p className="text-sm font-medium text-foreground leading-relaxed">{q.stem_text}</p>
                        </div>
                        <div className="space-y-1.5 mr-8">
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
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Clock className="w-3.5 h-3.5" />
                <span>آمار هر ۲ دقیقه به‌روز می‌شود</span>
              </div>

              <Button variant="hero" size="lg" onClick={handleGoBack} className="w-full max-w-sm">
                بازگشت به خانه
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ─── Active quiz: all 10 questions on one scrollable page ───
  quizStartedRef.current = true;
  return (
    <AppLayout hideNav>
      <div className="min-h-screen flex flex-col">
        {/* Sticky Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-lg">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>

          <div className="text-center">
            <div className="flex items-center gap-1.5 justify-center">
              <Flame className="w-4 h-4 text-accent" />
              <p className="text-xs text-accent font-semibold">آزمون روز</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {toPersianNumber(answeredSet.size)} از {toPersianNumber(totalQuestions)} پاسخ داده
            </p>
          </div>

          {/* Timer */}
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
            timeLeft <= 60
              ? "bg-destructive/10 text-destructive animate-pulse-soft"
              : timeLeft <= 120
                ? "bg-warning/10 text-warning"
                : "bg-secondary text-foreground"
          )}>
            <Timer className="w-3.5 h-3.5" />
            {formatTimer(timeLeft)}
          </div>
        </header>

        {/* Progress Bar */}
        <div className="h-1.5 bg-secondary">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
            style={{ width: `${totalQuestions > 0 ? (answeredSet.size / totalQuestions) * 100 : 0}%` }}
          />
        </div>

        {/* Free Badge */}
        <div className="px-4 pt-3 pb-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/10 rounded-full border border-success/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span className="text-xs font-medium text-success">رایگان — بدون کسر سهمیه</span>
          </div>
        </div>

        {/* All Questions Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-8">
          {questions.map((q, idx) => {
            const shuffle = shuffledData.get(q.question_id);
            const isAnswered = answeredSet.has(q.question_id);
            const result = answerResults.get(q.question_id);

            return (
              <div key={q.question_id} className="animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                {/* Question Number Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                    isAnswered
                      ? result?.isCorrect
                        ? "bg-success/20 text-success"
                        : "bg-destructive/20 text-destructive"
                      : "bg-primary/10 text-primary"
                  )}>
                    {toPersianNumber(idx + 1)}
                  </span>
                  {isAnswered && (
                    <span className={cn(
                      "text-xs font-medium",
                      result?.isCorrect ? "text-success" : "text-destructive"
                    )}>
                      {result?.isCorrect ? "صحیح ✓" : "اشتباه ✗"}
                    </span>
                  )}
                </div>

                <QuestionCard
                  questionId={q.question_id}
                  question={q.stem_text}
                  choices={shuffle?.shuffled ?? q.choices}
                  indexMap={shuffle?.indexMap}
                  onAnswer={handleAnswer(q.question_id)}
                  hasAnswered={isAnswered}
                  answerResult={result}
                />
              </div>
            );
          })}
        </div>

        {/* Submit Button — sticky at bottom */}
        <div className="sticky bottom-0 px-4 py-4 bg-background/80 backdrop-blur-lg border-t border-border">
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || (!allAnswered && timeLeft > 0)}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : allAnswered ? (
              <>ثبت نتیجه — {toPersianNumber(correctCount)} صحیح از {toPersianNumber(totalQuestions)}</>
            ) : timeLeft === 0 ? (
              "زمان تمام شد — ثبت نتیجه"
            ) : (
              <>ابتدا به همه سوالات پاسخ دهید ({toPersianNumber(answeredSet.size)}/{toPersianNumber(totalQuestions)})</>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Shared Sub-components ───

function DailyQuizHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-lg">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowRight className="w-5 h-5" />
      </Button>
      <div className="flex items-center gap-1.5">
        <Flame className="w-4 h-4 text-accent" />
        <p className="text-sm font-semibold text-foreground">آزمون روز</p>
      </div>
      <div className="w-10" />
    </header>
  );
}

function CompletedView({
  correctCount,
  totalCount,
  percentile,
  totalParticipants,
  onBack,
}: {
  correctCount: number;
  totalCount: number;
  percentile: number;
  totalParticipants: number;
  onBack: () => void;
}) {
  const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
      {/* Trophy Circle */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 via-accent/20 to-success/20 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Trophy className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-success rounded-full flex items-center justify-center shadow-md">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-1">
        {percentage >= 80 ? "عالی بود! 🎉" : percentage >= 50 ? "خوب بود! 👏" : "فردا بهتر میشه! 💪"}
      </h2>
      <p className="text-muted-foreground text-center mb-8">
        آزمون امروز انجام شده — نتایج زنده:
      </p>

      <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 mb-6 space-y-4">
        <div className="text-center">
          <p className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {toPersianNumber(correctCount)}/{toPersianNumber(totalCount)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">پاسخ صحیح ({toPersianNumber(percentage)}٪)</p>
        </div>
        <div className="h-px bg-border" />
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-3 text-center border border-success/20">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xl font-bold text-success">{toPersianNumber(percentile)}٪</span>
            </div>
            <p className="text-xs text-muted-foreground">بهتر از دیگران</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xl font-bold text-foreground">{toPersianNumber(totalParticipants)}</span>
            </div>
            <p className="text-xs text-muted-foreground">شرکت‌کننده</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        <Clock className="w-3.5 h-3.5" />
        <span>آمار هر ۲ دقیقه به‌روز می‌شود</span>
      </div>

      <Button variant="hero" size="lg" onClick={onBack} className="w-full max-w-sm">
        بازگشت به خانه
      </Button>
    </div>
  );
}
