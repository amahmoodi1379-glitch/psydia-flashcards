import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface FlashCardProps {
  question: string;
  choices: string[];
  correctIndex: number;
  onAnswer: (selectedIndex: number, isCorrect: boolean) => void;
  disabled?: boolean;
}

export function FlashCard({
  question,
  choices,
  correctIndex,
  onAnswer,
  disabled = false,
}: FlashCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const handleSelect = (index: number) => {
    if (hasAnswered || disabled) return;

    setSelectedIndex(index);
    setHasAnswered(true);

    const isCorrect = index === correctIndex;
    onAnswer(index, isCorrect);
  };

  const getChoiceState = (index: number) => {
    if (!hasAnswered) return "default";
    if (index === correctIndex) return "correct";
    if (index === selectedIndex && index !== correctIndex) return "incorrect";
    return "dimmed";
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      {/* Question Card */}
      <div className="bg-card rounded-2xl p-6 shadow-lg mb-6">
        <p className="text-lg font-medium leading-relaxed text-foreground">
          {question}
        </p>
      </div>

      {/* Choices */}
      <div className="space-y-3">
        {choices.map((choice, index) => {
          const state = getChoiceState(index);

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={hasAnswered || disabled}
              className={cn(
                "w-full p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-3",
                "border-2 shadow-sm",
                state === "default" &&
                  "bg-card border-border hover:border-primary/50 hover:bg-secondary/30 active:scale-[0.98]",
                state === "correct" &&
                  "bg-success/10 border-success text-success animate-scale-in",
                state === "incorrect" &&
                  "bg-destructive/10 border-destructive text-destructive animate-shake",
                state === "dimmed" && "bg-muted/50 border-border/50 opacity-50"
              )}
            >
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-all duration-200",
                  state === "default" && "bg-secondary text-secondary-foreground",
                  state === "correct" && "bg-success text-success-foreground",
                  state === "incorrect" && "bg-destructive text-destructive-foreground",
                  state === "dimmed" && "bg-muted text-muted-foreground"
                )}
              >
                {state === "correct" ? (
                  <Check className="w-4 h-4" />
                ) : state === "incorrect" ? (
                  <X className="w-4 h-4" />
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </div>
              <span
                className={cn(
                  "flex-1 font-medium",
                  state === "default" && "text-foreground",
                  state === "dimmed" && "text-muted-foreground"
                )}
              >
                {choice}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
