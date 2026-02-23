import { useOnboarding, ONBOARDING_STEPS } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { cn, toPersianNumber } from "@/lib/utils";

export function OnboardingModal() {
  const {
    isOnboardingActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipOnboarding,
  } = useOnboarding();

  if (!isOnboardingActive || !currentStep) return null;

  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={skipOnboarding}
      />
      
      {/* Modal */}
      <div className="relative w-[90%] max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-8">
          {/* Skip button */}
          <button
            onClick={skipOnboarding}
            className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-full bg-background/50 hover:bg-background/80 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          
          {/* Icon */}
          <div className="w-16 h-16 mx-auto bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          
          {/* Title */}
          <h2 className="text-xl font-bold text-foreground text-center">
            {currentStep.title}
          </h2>
        </div>
        
        {/* Content */}
        <div className="p-6 pt-4">
          <p className="text-muted-foreground text-center leading-relaxed mb-6">
            {currentStep.description}
          </p>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentStepIndex
                    ? "w-6 bg-primary"
                    : index < currentStepIndex
                    ? "bg-primary/50"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
          
          {/* Navigation */}
          <div className="flex gap-3">
            {!isFirstStep && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="flex-1"
              >
                <ChevronRight className="w-4 h-4 ml-1" />
                قبلی
              </Button>
            )}
            
            <Button
              variant="hero"
              onClick={nextStep}
              className="flex-1"
            >
              {isLastStep ? "شروع کنید!" : "بعدی"}
              {!isLastStep && <ChevronLeft className="w-4 h-4 mr-1" />}
            </Button>
          </div>
          
          {/* Step counter */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            {toPersianNumber(currentStepIndex + 1)} از {toPersianNumber(totalSteps)}
          </p>
        </div>
      </div>
    </div>
  );
}
