import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Star, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const toPersianNumber = (num: number): string => {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

// Sample question for UI demo
const sampleQuestion = {
  id: "1",
  stem_text:
    "بر اساس مراحل رشد روانی-اجتماعی اریکسون، تعارض اصلی در دوره نوجوانی چیست؟",
  choices: [
    "اعتماد در برابر بی‌اعتمادی",
    "سازندگی در برابر حقارت",
    "هویت در برابر سردرگمی نقش",
    "صمیمیت در برابر انزوا",
  ],
  correct_index: 2,
  explanation: "اریکسون معتقد بود که بحران اصلی نوجوانی، شکل‌گیری هویت است. نوجوان در این مرحله تلاش می‌کند تا بفهمد کیست و چه نقشی در جامعه دارد. موفقیت در این مرحله منجر به احساس هویت منسجم می‌شود.",
};

export default function ReviewPage() {
  const navigate = useNavigate();
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentQuestion] = useState(1);
  const [totalQuestions] = useState(10);

  const handleAnswer = () => {
    setHasAnswered(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion >= totalQuestions) {
      setIsComplete(true);
    } else {
      // In real app, would load next question
      setHasAnswered(false);
    }
  };

  const handleGoBack = () => {
    navigate("/");
  };

  const handleReport = () => {
    console.log("Report question:", sampleQuestion.id);
  };

  if (isComplete) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
            <Trophy className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            آفرین! 🎉
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            جلسه امروز را با موفقیت تمام کردید.
          </p>
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
              سوال {toPersianNumber(currentQuestion)} از {toPersianNumber(totalQuestions)}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsBookmarked(!isBookmarked)}
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
            style={{ width: `${(currentQuestion / totalQuestions) * 100}%` }}
          />
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col px-4 py-6">
          <QuestionCard
            question={sampleQuestion.stem_text}
            choices={sampleQuestion.choices}
            correctIndex={sampleQuestion.correct_index}
            explanation={sampleQuestion.explanation}
            onAnswer={handleAnswer}
            hasAnswered={hasAnswered}
          />
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
              سوال بعدی
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}