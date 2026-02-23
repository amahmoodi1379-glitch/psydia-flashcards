import { useState } from "react";
import { cn } from "@/lib/utils";
import { HelpCircle, CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuestionCardProps {
  questionId: string;
  question: string;
  choices: string[];
  /** indexMap[shuffledPos] = originalPos. If omitted, indices are used as-is. */
  indexMap?: number[];
  onAnswer: (selectedIndex: number, correct: boolean, correctIndex: number, explanation?: string) => void;
  hasAnswered: boolean;
  answerResult?: {
    isCorrect: boolean;
    correctIndex: number;
    explanation?: string;
  };
}

export function QuestionCard({
  questionId,
  question,
  choices,
  indexMap,
  onAnswer,
  hasAnswered,
  answerResult,
}: QuestionCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [usedDontKnow, setUsedDontKnow] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  const correctIndex = answerResult?.correctIndex ?? -1;
  const explanation = answerResult?.explanation;

  // Build reverse map: reverseMap[originalPos] = shuffledPos
  const reverseMap = indexMap
    ? indexMap.reduce<Record<number, number>>((acc, origIdx, shuffledIdx) => {
        acc[origIdx] = shuffledIdx;
        return acc;
      }, {})
    : null;

  const checkAnswer = async (shuffledIndex: number) => {
    setIsChecking(true);
    setHasError(false);
    setPendingIndex(shuffledIndex);
    
    if (shuffledIndex !== -1) {
      setSelectedIndex(shuffledIndex);
    }

    // Map shuffled index to original for the RPC call
    const originalIndex = shuffledIndex === -1
      ? -1
      : (indexMap ? indexMap[shuffledIndex] : shuffledIndex);
    
    try {
      const { data, error } = await supabase.rpc("check_answer", {
        _question_id: questionId,
        _selected_index: originalIndex,
      });
      
      if (error) throw error;
      
      const result = data?.[0];
      if (result) {
        // Map the returned correct_index (original) back to shuffled space
        const shuffledCorrectIndex = reverseMap
          ? (reverseMap[result.correct_index] ?? result.correct_index)
          : result.correct_index;

        onAnswer(shuffledIndex, result.is_correct, shuffledCorrectIndex, result.explanation || undefined);
      } else {
        throw new Error("No result returned");
      }
    } catch (err) {
      console.error("Error checking answer:", err);
      setHasError(true);
      toast.error("خطا در بررسی پاسخ. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleChoiceClick = async (index: number) => {
    if (hasAnswered || isChecking) return;
    await checkAnswer(index);
  };

  const handleDontKnow = async () => {
    if (hasAnswered || isChecking) return;
    setUsedDontKnow(true);
    setSelectedIndex(null);
    await checkAnswer(-1);
  };

  const handleRetry = () => {
    if (pendingIndex !== null) {
      checkAnswer(pendingIndex);
    }
  };

  const getChoiceStyle = (index: number) => {
    if (!hasAnswered) {
      if (isChecking && selectedIndex === index) {
        return "bg-secondary border-primary animate-pulse";
      }
      if (hasError && selectedIndex === index) {
        return "bg-destructive/10 border-destructive";
      }
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
    if (!hasAnswered) {
      if (isChecking && selectedIndex === index) {
        return <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />;
      }
      if (hasError && selectedIndex === index) {
        return <AlertCircle className="w-5 h-5 text-destructive shrink-0" />;
      }
      return null;
    }

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
            disabled={hasAnswered || isChecking}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-right transition-all duration-200 flex items-center gap-3",
              getChoiceStyle(index),
              !hasAnswered && !isChecking && "active:scale-[0.98]"
            )}
          >
            <span className="flex-1 font-medium">{choice}</span>
            {getChoiceIcon(index)}
          </button>
        ))}
      </div>

      {/* Error Retry Button */}
      {hasError && !hasAnswered && (
        <button
          onClick={handleRetry}
          className="w-full p-3 rounded-xl border-2 border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          <span className="font-medium">تلاش مجدد</span>
        </button>
      )}

      {/* Don't Know Button */}
      {!hasAnswered && !hasError && (
        <button
          onClick={handleDontKnow}
          disabled={isChecking}
          className={cn(
            "w-full p-3 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground transition-all duration-200 flex items-center justify-center gap-2",
            isChecking && "opacity-50 cursor-not-allowed"
          )}
        >
          {isChecking && usedDontKnow ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <HelpCircle className="w-5 h-5" />
          )}
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
          answerResult?.isCorrect ? "text-success" : "text-destructive"
        )}>
          {usedDontKnow ? (
            <p className="font-medium text-muted-foreground">پاسخ صحیح نمایش داده شد</p>
          ) : answerResult?.isCorrect ? (
            <p className="font-medium">آفرین! پاسخ صحیح است ✓</p>
          ) : (
            <p className="font-medium">پاسخ اشتباه است ✗</p>
          )}
        </div>
      )}
    </div>
  );
}
