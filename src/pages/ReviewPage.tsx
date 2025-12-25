import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { FlashCard } from "@/components/exam/FlashCard";
import { DifficultyButtons } from "@/components/exam/DifficultyButtons";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy } from "lucide-react";

// Sample question for UI demo
const sampleQuestion = {
  id: "1",
  stem_text:
    "According to Erikson's stages of psychosocial development, what is the primary conflict during adolescence?",
  choices: [
    "Trust vs. Mistrust",
    "Industry vs. Inferiority",
    "Identity vs. Role Confusion",
    "Intimacy vs. Isolation",
  ],
  correct_index: 2,
};

export default function ReviewPage() {
  const navigate = useNavigate();
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleAnswer = (selectedIndex: number, correct: boolean) => {
    setHasAnswered(true);
    setIsCorrect(correct);
  };

  const handleDifficulty = (difficulty: "easy" | "medium" | "hard") => {
    console.log("Selected difficulty:", difficulty);
    // For demo, just show completion
    setIsComplete(true);
  };

  const handleGoBack = () => {
    navigate("/");
  };

  if (isComplete) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
            <Trophy className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Great job! 🎉
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            You've completed today's review session.
          </p>
          <Button variant="hero" size="lg" onClick={handleGoBack}>
            Back to Dashboard
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
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Card 1 of 1</p>
            <p className="text-xs text-muted-foreground">Demo Mode</p>
          </div>
          <div className="w-10" /> {/* Spacer for alignment */}
        </header>

        {/* Progress Bar */}
        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: hasAnswered ? "100%" : "0%" }}
          />
        </div>

        {/* Question Area */}
        <div className="flex-1 flex items-center px-4 py-8">
          <FlashCard
            question={sampleQuestion.stem_text}
            choices={sampleQuestion.choices}
            correctIndex={sampleQuestion.correct_index}
            onAnswer={handleAnswer}
          />
        </div>

        {/* Difficulty Buttons */}
        <DifficultyButtons onSelect={handleDifficulty} visible={hasAnswered} />
      </div>
    </AppLayout>
  );
}
