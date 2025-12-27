import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Star, Flag, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReviewQuestions, ReviewFilter } from "@/hooks/useReviewQuestions";
import { useRecordAnswer } from "@/hooks/useRecordAnswer";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
const toPersianNumber = (num: number): string => {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

export default function ReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionSize = location.state?.sessionSize || 10;
  const filter: ReviewFilter = location.state?.filter || { type: "daily" };
  const sessionTitle = location.state?.title || "مرور روزانه";
  
  const { questions, isLoading, error } = useReviewQuestions(sessionSize, filter);
  const { recordAnswer } = useRecordAnswer();
  const { toggleBookmark, isBookmarked: checkIsBookmarked } = useBookmarks();
  const { hasFeature } = useSubscription();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    correctIndex: number;
    explanation?: string;
  } | undefined>();

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isBookmarked = currentQuestion ? checkIsBookmarked(currentQuestion.id) : false;
  const canBookmark = hasFeature("bookmarks");

  const handleAnswer = async (selectedIndex: number, correct: boolean, correctIndex: number, explanation?: string) => {
    setHasAnswered(true);
    
    setAnswerResult({
      isCorrect: correct,
      correctIndex,
      explanation,
    });
    
    if (correct) {
      setCorrectCount((prev) => prev + 1);
    }
    
    // Record answer with SM2 algorithm
    if (currentQuestion) {
      await recordAnswer(currentQuestion.id, selectedIndex, correct);
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
    // TODO: Implement report functionality
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">در حال بارگذاری سوالات...</p>
        </div>
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
