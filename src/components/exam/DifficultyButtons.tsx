import { Button } from "@/components/ui/button";
import { Zap, Clock, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface DifficultyButtonsProps {
  onSelect: (difficulty: "easy" | "medium" | "hard") => void;
  visible: boolean;
}

const difficulties = [
  {
    key: "easy" as const,
    label: "Easy",
    icon: Zap,
    description: "< 1 min",
    color: "text-success border-success/30 hover:bg-success/10",
  },
  {
    key: "medium" as const,
    label: "Medium",
    icon: Clock,
    description: "< 10 min",
    color: "text-accent border-accent/30 hover:bg-accent/10",
  },
  {
    key: "hard" as const,
    label: "Hard",
    icon: Brain,
    description: "Again",
    color: "text-destructive border-destructive/30 hover:bg-destructive/10",
  },
];

export function DifficultyButtons({ onSelect, visible }: DifficultyButtonsProps) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent animate-slide-up">
      <div className="max-w-md mx-auto">
        <p className="text-center text-sm text-muted-foreground mb-3">
          How well did you know this?
        </p>
        <div className="grid grid-cols-3 gap-3">
          {difficulties.map((diff) => {
            const Icon = diff.icon;
            return (
              <Button
                key={diff.key}
                variant="difficulty"
                onClick={() => onSelect(diff.key)}
                className={cn(
                  "flex-col h-auto py-4 gap-1",
                  diff.color
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-semibold">{diff.label}</span>
                <span className="text-xs opacity-70">{diff.description}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
