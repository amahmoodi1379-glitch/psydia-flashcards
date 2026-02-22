import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Star, Flag, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReviewQuestions, ReviewFilter } from "@/hooks/useReviewQuestions";
import { useRecordAnswer } from "@/hooks/useRecordAnswer";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useSubscription } from "@/hooks/useSubscription";
import { useSessionPersistence, SavedSession } from "@/hooks/useSessionPersistence";
import { ReviewPageSkeleton } from "@/components/skeleton/ReviewPageSkeleton";
import { toast } from "sonner";

const toPersianNumber = (num: number): string => {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

export default function ReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Read params from URL as a reliable fallback (Telegram WebView may drop navigation state)
  const params = new URLSearchParams(location.search);
  const qpType = params.get("type") as ReviewFilter["type"] | null;
  const qpId = params.get("id") ?? undefined;
  const qpSize = params.get("size");
  const qpTitle = params.get("title");

  // Read last navigation intent from sessionStorage as a second fallback
  let storedNav:
    | { sessionSize: number; filter: ReviewFilter; title: string; ts?: number }
    | undefined;
  try {
    const raw = sessionStorage.getItem("review_nav");
    if (raw) storedNav = JSON.parse(raw);
  } catch {
    // ignore
  }

  const storedFilter = storedNav?.filter;
  const storedSessionSize = storedNav?.sessionSize;
  const storedTitle = storedNav?.title;

  // Check if resuming a session
  const isResuming = location.state?.resume === true;
  const resumedSession: SavedSession | undefined = location.state?.savedSession;

  const sessionSize =
    resumedSession?.sessionSize ||
    location.state?.sessionSize ||
    (qpSize ? Number(qpSize) : undefined) ||
    storedSessionSize ||
    10;

  const filter: ReviewFilter =
    resumedSession?.filter ||
    location.state?.filter ||
    (qpType ? { type: qpType, id: qpId } : undefined) ||
    storedFilter ||
    { type: "daily" };

  const sessionTitle =
    resumedSession?.title ||
    location.state?.title ||
    qpTitle ||
    storedTitle ||
    "مرور روزانه";


  const { questions, isLoading, error } = useReviewQuestions(sessionSize, filter);
  const { recordAnswer } = useRecordAnswer();
  const { toggleBookmark, isBookmarked: checkIsBookmarked } = useBookmarks();
  const { hasFeature } = useSubscription();
  const { saveSession, clearSession } = useSessionPersistence();
  
  // Initialize state from resumed session or defaults
  const [currentIndex, setCurrentIndex] = useState(resumedSession?.currentIndex || 0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(resumedSession?.correctCount || 0);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>(resumedSession?.answeredQuestions || []);
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    correctIndex: number;
    explanation?: string;
  } | undefined>();

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isBookmarked = currentQuestion ? checkIsBookmarked(currentQuestion.id) : false;
  const canBookmark = hasFeature("bookmarks");

  // Save session whenever state changes (after questions are loaded)
  useEffect(() => {
    if (questions.length > 0 && !isComplete && currentIndex < questions.length) {
      saveSession({
        filter,
        sessionSize,
        title: sessionTitle,
        currentIndex,
        correctCount,
        questionIds: questions.map(q => q.id),
        answeredQuestions,
      });
    }
  }, [currentIndex, correctCount, answeredQuestions, questions, isComplete]);

  // If resuming, check if current question was already answered
  useEffect(() => {
    if (isResuming && resumedSession && questions.length > 0) {
      const currentQ = questions[currentIndex];
      if (currentQ && answeredQuestions.includes(currentQ.id)) {
        // This question was answered, move to next unanswered
        const nextUnanswered = questions.findIndex(
          (q, i) => i >= currentIndex && !answeredQuestions.includes(q.id)
        );
        if (nextUnanswered !== -1) {
          setCurrentIndex(nextUnanswered);
        } else {
          // All questions answered
          setIsComplete(true);
        }
      }
    }
  }, [isResuming, questions]);

  const handleAnswer = async (selectedIndex: number, correct: boolean, correctIndex: number, explanation?: string) => {
    if (currentQuestion) {
      try {
        await recordAnswer(currentQuestion.id, selectedIndex, correct);

        setHasAnswered(true);
        setAnswerResult({
          isCorrect: correct,
          correctIndex,
          explanation,
        });

        if (correct) {
          setCorrectCount((prev) => prev + 1);
        }

        setAnsweredQuestions((prev) =>
          prev.includes(currentQuestion.id) ? prev : [...prev, currentQuestion.id]
        );
      } catch (recordError) {
        const message =
          recordError instanceof Error
            ? recordError.message
            : "ذخیره پاسخ انجام نشد. لطفاً دوباره تلاش کنید.";
        toast.error(`${message} شما می‌توانید همین سوال را دوباره پاسخ دهید.`);

        setHasAnswered(false);
        setAnswerResult(undefined);
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex >= totalQuestions - 1) {
      setIsComplete(true);
      clearSession(); // Clear saved session on completion
    } else {
      setCurrentIndex((prev) => prev + 1);
      setHasAnswered(false);
      setAnswerResult(undefined);
    }
  };

  const handleGoBack = () => {
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
    if (!currentQuestion) return;
    console.log("Report question:", currentQuestion.id);
    toast.info("گزارش شما ثبت شد");
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
          <p className="text-destructive mb-4">{error || "سوالی یافت نشد"}</p>
          <Button variant="outline" onClick={handleGoBack}>
            بازگشت
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Complete state
  if (isComplete) {
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    
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
            جلسه را با موفقیت تمام کردید.
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
          {currentQuestion && (
            <QuestionCard
              key={currentQuestion.id}
              questionId={currentQuestion.id}
              question={currentQuestion.stem_text}
              choices={currentQuestion.choices}
              onAnswer={handleAnswer}
              hasAnswered={hasAnswered}
              answerResult={answerResult}
            />
          )}
        </div>

        {/* Next Button - Only visible after answering */}
        {hasAnswered && (
          <div className="px-4 pb-6 animate-slide-up">
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
