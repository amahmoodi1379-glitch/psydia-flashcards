import { useState } from "react";
import { cn } from "@/lib/utils";
import { HelpCircle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";

interface QuestionCardProps {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
  onAnswer: (selectedIndex: number, correct: boolean) => void;
  hasAnswered: boolean;
}

export function QuestionCard({
  question,
  choices,
  correctIndex,
  explanation,
  onAnswer,
  hasAnswered,
}: QuestionCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [usedDontKnow, setUsedDontKnow] = useState(false);

  const handleChoiceClick = (index: number) => {
    if (hasAnswered) return;
    setSelectedIndex(index);
    onAnswer(index, index === correctIndex);
  };

  const handleDontKnow = () => {
    if (hasAnswered) return;
    setUsedDontKnow(true);
    setSelectedIndex(null);
    onAnswer(-1, false);
  };

  const getChoiceStyle = (index: number) => {
    if (!hasAnswered) {
      return "bg-secondary hover:bg-secondary/80 border-transparent";
    }

    if (index === correctIndex) {
      return "bg-success/10 border-success text-success";
    }

    if (index === selectedIndex && index !== correctIndex) {
      return "bg-destructive/10 border-destructive text-destructive";
    }

    return "bg-secondary/50 border-transparent opacity-50";
  };

  const getChoiceIcon = (index: number) => {
    if (!hasAnswered) return null;

    if (index === correctIndex) {
      return <CheckCircle2 className="w-5 h-5 text-success shrink-0" />;
    }

    if (index === selectedIndex && index !== correctIndex) {
      return <XCircle className="w-5 h-5 text-destructive shrink-0" />;
    }

    return null;
  };

  return (
    <div className="flex flex-col gap-4 w-full animate-fade-in">
      {/* Question Stem */}
      <div className="bg-card rounded-2xl p-5 border border-border">
        <p className="text-lg font-medium text-foreground leading-relaxed">
          {question}
        </p>
      </div>

      {/* Choices */}
      <div className="flex flex-col gap-3">
        {choices.map((choice, index) => (
          <button
            key={index}
            onClick={() => handleChoiceClick(index)}
            disabled={hasAnswered}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-right transition-all duration-200 flex items-center gap-3",
              getChoiceStyle(index),
              !hasAnswered && "active:scale-[0.98]"
            )}
          >
            <span className="flex-1 font-medium">{choice}</span>
            {getChoiceIcon(index)}
          </button>
        ))}
      </div>

      {/* Don't Know Button */}
      {!hasAnswered && (
        <button
          onClick={handleDontKnow}
          className="w-full p-3 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground transition-all duration-200 flex items-center justify-center gap-2"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="font-medium">نمی‌دانم</span>
        </button>
      )}

      {/* Explanation Box - Only visible after answering */}
      {hasAnswered && explanation && (
        <div className="animate-fade-in">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="w-full flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20 text-primary hover:bg-primary/10 transition-colors"
          >
            <span className="font-semibold">توضیحات پاسخ</span>
            {showExplanation ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
          
          {showExplanation && (
            <div className="mt-2 p-4 bg-card rounded-xl border border-border animate-fade-in">
              <p className="text-foreground leading-relaxed">{explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Feedback Message */}
      {hasAnswered && (
        <div className={cn(
          "text-center py-2 animate-fade-in",
          selectedIndex === correctIndex ? "text-success" : "text-destructive"
        )}>
          {usedDontKnow ? (
            <p className="font-medium text-muted-foreground">پاسخ صحیح نمایش داده شد</p>
          ) : selectedIndex === correctIndex ? (
            <p className="font-medium">آفرین! پاسخ صحیح است ✓</p>
          ) : (
            <p className="font-medium">پاسخ اشتباه است ✗</p>
          )}
        </div>
      )}
    </div>
  );
}