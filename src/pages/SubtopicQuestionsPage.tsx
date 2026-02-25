import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Box,
  Flag,
  Star,
  Lock,
  Filter,
} from "lucide-react";
import { cn, toPersianNumber, shuffleChoices } from "@/lib/utils";
import { useSubtopicQuestions } from "@/hooks/useSubtopicQuestions";
import { useRecordAnswer } from "@/hooks/useRecordAnswer";
import { useLeitnerToggle } from "@/hooks/useLeitnerToggle";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useSubscription } from "@/hooks/useSubscription";

import { useReportQuestion } from "@/hooks/useReportQuestion";
import { ReportReasonDialog } from "@/components/exam/ReportReasonDialog";
import { toast } from "sonner";
import { hapticImpact } from "@/lib/haptic";

export default function SubtopicQuestionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const params = new URLSearchParams(location.search);
  const subtopicId = params.get("id") ?? location.state?.subtopicId;
  const subtopicTitle = params.get("title") ?? location.state?.title ?? "سوالات";

  const {
    questions,
    isLoading,
    error,
    totalCount,
    page,
    totalPages,
    setPage,
    onlyUnanswered,
    setOnlyUnanswered,
  } = useSubtopicQuestions(subtopicId);

  const { recordAnswer } = useRecordAnswer();
  const { toggleLeitner, isToggling } = useLeitnerToggle();
  const { toggleBookmark, isBookmarked: checkIsBookmarked } = useBookmarks();
  const { hasFeature, refetch: refetchSubscription } = useSubscription();
  const { reportQuestion, isReporting } = useReportQuestion();

  const canBookmark = hasFeature("bookmarks");

  // Track answered state per question (local, for this page session)
  const [answeredMap, setAnsweredMap] = useState<
    Map<string, { isCorrect: boolean; correctIndex: number; explanation?: string }>
  >(new Map());
  const [leitnerMap, setLeitnerMap] = useState<Map<string, boolean>>(new Map());
  const answerRequestIdsRef = useRef<Map<string, string>>(new Map());

  // Initialize unknown leitner states from server data when questions change.
  // Keeps user-toggled values already present in local map.
  useEffect(() => {
    if (questions.length === 0) return;

    setLeitnerMap((prev) => {
      const next = new Map(prev);

      for (const q of questions) {
        if (!next.has(q.id)) {
          next.set(q.id, q.is_in_leitner);
        }
      }

      return next;
    });
  }, [questions]);

  // Precompute shuffled choices for all questions on this page
  const shuffledData = useMemo(() => {
    const map = new Map<string, { shuffled: string[]; indexMap: number[] }>();
    for (const q of questions) {
      map.set(q.id, shuffleChoices(q.choices, q.id));
    }
    return map;
  }, [questions]);

  const handleAnswer = async (
    questionId: string,
    selectedShuffledIndex: number,
    correct: boolean,
    correctShuffledIndex: number,
    explanation?: string
  ) => {
    if (answeredMap.has(questionId)) return;

    const requestId = answerRequestIdsRef.current.get(questionId) ?? crypto.randomUUID();
    answerRequestIdsRef.current.set(questionId, requestId);

    // Map shuffled index back to original (-1 means "don't know")
    const shuffle = shuffledData.get(questionId);
    const originalSelectedIndex = selectedShuffledIndex === -1
      ? -1
      : (shuffle ? shuffle.indexMap[selectedShuffledIndex] : selectedShuffledIndex);

    try {
      const result = await recordAnswer(questionId, originalSelectedIndex, correct, {
        clientRequestId: requestId,
      });

      if (!result.quotaAllowed) {
        toast.error("سهمیه روزانه شما تمام شده است.");
        navigate("/subscription");
        return;
      }

      setAnsweredMap((prev) =>
        new Map(prev).set(questionId, {
          isCorrect: correct,
          correctIndex: correctShuffledIndex,
          explanation,
        })
      );

      // record_answer no longer auto-adds to Leitner.
      // Keep existing leitner state (if already in Leitner, it was updated server-side).
      // In unanswered mode the question stays visible for the rest of this session;
      // it disappears automatically the next time the user opens this page.
      await Promise.all([
        refetchSubscription(),
        queryClient.invalidateQueries({ queryKey: ["leitner-due-count"] }),
        queryClient.invalidateQueries({ queryKey: ["subtopic-questions"] }),
      ]);
    } catch (recordError) {
      const message =
        recordError instanceof Error
          ? recordError.message
          : "ذخیره پاسخ انجام نشد. لطفاً دوباره تلاش کنید.";
      toast.error(message);
    }
  };

  const handleToggleLeitner = async (questionId: string) => {
    hapticImpact("medium");
    try {
      const result = await toggleLeitner(questionId);
      setLeitnerMap((prev) => new Map(prev).set(questionId, result.is_in_leitner));
    } catch {
      // Error toast is handled by the hook
    }
  };

  const handleToggleBookmark = (questionId: string) => {
    if (!canBookmark) {
      toast.error("برای استفاده از نشان‌گذاری، پلن پیشرفته تهیه کنید");
      return;
    }
    hapticImpact("light");
    toggleBookmark(questionId);
  };

  const [reportDialogQuestionId, setReportDialogQuestionId] = useState<string | null>(null);

  const handleReport = (questionId: string) => {
    if (isReporting) return;
    setReportDialogQuestionId(questionId);
  };

  const handleSubmitReport = (reason: string) => {
    if (!reportDialogQuestionId) return;
    reportQuestion(reportDialogQuestionId, reason);
    setReportDialogQuestionId(null);
  };

  const handleGoBack = () => {
    navigate("/");
  };

  // Invalid route state (missing subtopic id)
  if (!subtopicId) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <p className="text-destructive mb-4">شناسه سرفصل نامعتبر است</p>
          <Button variant="outline" onClick={handleGoBack}>
            بازگشت
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Loading state
  if (isLoading && questions.length === 0) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-lg">
            <Button variant="ghost" size="icon" onClick={handleGoBack}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{subtopicTitle}</p>
            </div>
            <div className="w-10" />
          </header>
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">در حال بارگذاری...</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={handleGoBack}>
            بازگشت
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideNav>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-lg">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="text-center flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{subtopicTitle}</p>
            <p className="text-xs text-muted-foreground">
              {toPersianNumber(totalCount)} سوال
              {totalPages > 1 && (
                <> &bull; صفحه {toPersianNumber(page)} از {toPersianNumber(totalPages)}</>
              )}
            </p>
          </div>
          <div className="w-10" />
        </header>

        {/* Filter Toggle */}
        <div className="px-4 py-3 border-b border-border bg-card/30 flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <button
            onClick={() => setOnlyUnanswered(false)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              !onlyUnanswered
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            همه سوالات
          </button>
          <button
            onClick={() => setOnlyUnanswered(true)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              onlyUnanswered
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            فقط نزده‌ها
          </button>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {questions.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {onlyUnanswered ? "همه سوالات را پاسخ داده‌اید!" : "سوالی یافت نشد"}
              </p>
            </div>
          )}

          {questions.map((q, idx) => {
            const answered = answeredMap.get(q.id);
            const isInLeitner = leitnerMap.get(q.id) ?? q.is_in_leitner;
            const shuffle = shuffledData.get(q.id)!;
            const questionNumber = (page - 1) * 10 + idx + 1;

            return (
              <div key={q.id} className="animate-fade-in">
                {/* Question number badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                    سوال {toPersianNumber(questionNumber)}
                  </span>
                  <div className="flex items-center gap-1">
                    {/* Bookmark button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8",
                        canBookmark && checkIsBookmarked(q.id) && "text-accent"
                      )}
                      onClick={() => handleToggleBookmark(q.id)}
                    >
                      {canBookmark ? (
                        <Star
                          className={cn(
                            "w-4 h-4",
                            checkIsBookmarked(q.id) && "fill-current"
                          )}
                        />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </Button>
                    {/* Report button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleReport(q.id)}
                    >
                      <Flag className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <QuestionCard
                  questionId={q.id}
                  question={q.stem_text}
                  choices={shuffle.shuffled}
                  indexMap={shuffle.indexMap}
                  onAnswer={(selectedIndex, correct, correctIndex, explanation) =>
                    handleAnswer(q.id, selectedIndex, correct, correctIndex, explanation)
                  }
                  hasAnswered={!!answered}
                  answerResult={answered}
                />

                {/* Leitner Toggle - visible after answering */}
                {!!answered && (
                  <div className="mt-3 animate-fade-in">
                    <button
                      onClick={() => handleToggleLeitner(q.id)}
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
                  </div>
                )}

                {/* Separator */}
                {idx < questions.length - 1 && (
                  <div className="mt-6 border-t border-border" />
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border bg-card/50 backdrop-blur-lg flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1 || isLoading}
              className="gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              قبلی
            </Button>

            <span className="text-sm text-muted-foreground">
              {toPersianNumber(page)} / {toPersianNumber(totalPages)}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="gap-1"
            >
              بعدی
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <ReportReasonDialog
        open={!!reportDialogQuestionId}
        onOpenChange={(open) => { if (!open) setReportDialogQuestionId(null); }}
        onSubmit={handleSubmitReport}
        isSubmitting={isReporting}
      />
    </AppLayout>
  );
}
