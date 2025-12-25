import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Star, Flag, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuestions } from "@/hooks/useQuestions";
import { useRecordAnswer } from "@/hooks/useRecordAnswer";

const toPersianNumber = (num: number): string => {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

export default function ReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionSize = location.state?.sessionSize || 10;
  
  const { questions, isLoading, error } = useQuestions(sessionSize);
  const { recordAnswer } = useRecordAnswer();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [correctCount, setCorrectCount] = useState(0);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isBookmarked = currentQuestion ? bookmarkedIds.has(currentQuestion.id) : false;

  const handleAnswer = async (selectedIndex: number, correct: boolean) => {
    setHasAnswered(true);
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
    }
  };

  const handleGoBack = () => {
    navigate("/");
  };

  const handleToggleBookmark = () => {
    if (!currentQuestion) return;
    
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
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
            جلسه امروز را با موفقیت تمام کردید.
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
            <p className="text-sm font-medium text-foreground">
              سوال {toPersianNumber(currentIndex + 1)} از {toPersianNumber(totalQuestions)}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleToggleBookmark}
              className={cn(isBookmarked && "text-accent")}
            >
              <Star className={cn("w-5 h-5", isBookmarked && "fill-current")} />
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
              question={currentQuestion.stem_text}
              choices={currentQuestion.choices}
              correctIndex={currentQuestion.correct_index}
              explanation={currentQuestion.explanation || undefined}
              onAnswer={handleAnswer}
              hasAnswered={hasAnswered}
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
