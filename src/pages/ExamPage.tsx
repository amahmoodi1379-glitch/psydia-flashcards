import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/exam/StatsCard";
import { Button } from "@/components/ui/button";
import { Calendar, Flame, BookOpen, PlayCircle } from "lucide-react";

export default function ExamPage() {
  const navigate = useNavigate();

  const handleStartReview = () => {
    navigate("/review");
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Good morning! 👋
          </h1>
          <p className="text-muted-foreground">
            Ready to master psychology today?
          </p>
        </header>

        {/* Main Stats Card */}
        <div className="mb-6" style={{ animationDelay: "0.1s" }}>
          <StatsCard
            icon={Calendar}
            label="Cards Due Today"
            value={0}
            sublabel="You're all caught up!"
            variant="primary"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div style={{ animationDelay: "0.2s" }}>
            <StatsCard
              icon={Flame}
              label="Streak"
              value="0"
              sublabel="days"
              variant="accent"
            />
          </div>
          <div style={{ animationDelay: "0.3s" }}>
            <StatsCard
              icon={BookOpen}
              label="Total Cards"
              value={0}
              sublabel="learned"
            />
          </div>
        </div>

        {/* Start Button */}
        <div className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={handleStartReview}
          >
            <PlayCircle className="w-6 h-6" />
            Start Daily Review
          </Button>
        </div>

        {/* Empty State */}
        <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <div className="bg-secondary/50 rounded-2xl p-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              No cards yet
            </h3>
            <p className="text-sm text-muted-foreground">
              Connect to Supabase to load your psychology flashcards and start learning!
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
