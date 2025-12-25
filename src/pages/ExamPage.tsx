import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PlayCircle, RotateCcw, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const toPersianNumber = (num: number): string => {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

const sessionSizes = [10, 20, 30];

export default function ExamPage() {
  const navigate = useNavigate();
  const [sessionSize, setSessionSize] = useState(20);
  const [hasActiveSession] = useState(false); // Will be connected to state later

  const handleStartReview = () => {
    navigate("/review", { state: { sessionSize } });
  };

  const handleResumeSession = () => {
    navigate("/review", { state: { resume: true } });
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            برنامه امروز من
          </h1>
          <p className="text-muted-foreground">
            آماده تمرین هستید؟
          </p>
        </header>

        {/* Resume Card - Only visible if session is active */}
        {hasActiveSession && (
          <div 
            className="mb-6 animate-fade-in"
            style={{ animationDelay: "0.05s" }}
          >
            <button
              onClick={handleResumeSession}
              className="w-full bg-accent/10 border border-accent/30 rounded-2xl p-4 flex items-center gap-4 hover:bg-accent/20 transition-colors"
            >
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-accent" />
              </div>
              <div className="text-right flex-1">
                <p className="font-semibold text-foreground">ادامه آزمون قبلی</p>
                <p className="text-sm text-muted-foreground">
                  {toPersianNumber(5)} سوال باقی مانده
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Stats Card */}
        <div 
          className="mb-6 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="bg-card rounded-2xl p-5 border border-border">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {toPersianNumber(0)}
                </p>
                <p className="text-sm text-muted-foreground">کارت برای امروز</p>
              </div>
            </div>
          </div>
        </div>

        {/* Session Size Toggle */}
        <div 
          className="mb-6 animate-fade-in"
          style={{ animationDelay: "0.15s" }}
        >
          <p className="text-sm font-medium text-muted-foreground mb-3">
            تعداد سوالات جلسه
          </p>
          <div className="flex gap-2">
            {sessionSizes.map((size) => (
              <button
                key={size}
                onClick={() => setSessionSize(size)}
                className={cn(
                  "flex-1 py-3 rounded-xl font-semibold text-lg transition-all duration-200",
                  sessionSize === size
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {toPersianNumber(size)}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div 
          className="animate-fade-in" 
          style={{ animationDelay: "0.2s" }}
        >
          <Button
            variant="hero"
            size="xl"
            className="w-full gap-3"
            onClick={handleStartReview}
          >
            <PlayCircle className="w-6 h-6" />
            شروع مرور روزانه
          </Button>
        </div>

        {/* Empty State Info */}
        <div 
          className="mt-8 text-center animate-fade-in" 
          style={{ animationDelay: "0.25s" }}
        >
          <div className="bg-secondary/50 rounded-2xl p-6">
            <p className="text-sm text-muted-foreground">
              برای شروع، اتصال به پایگاه داده را فعال کنید تا سوالات بارگذاری شوند.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}