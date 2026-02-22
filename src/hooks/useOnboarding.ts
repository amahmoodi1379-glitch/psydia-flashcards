import { useState, useEffect, useCallback } from "react";

const ONBOARDING_KEY = "onboarding_completed";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "به نرم‌افزار مرور خوش آمدید! 👋",
    description: "این برنامه به شما کمک می‌کند با روش علمی فاصله‌دار، مطالب را بهتر یاد بگیرید.",
  },
  {
    id: "daily-review",
    title: "مرور روزانه 📚",
    description: "هر روز سوالاتی که نیاز به مرور دارند به شما نمایش داده می‌شوند. سیستم SM2 بهترین زمان مرور را تعیین می‌کند.",
  },
  {
    id: "subjects",
    title: "انتخاب درس 📖",
    description: "می‌توانید از بین دروس مختلف، موضوع مورد نظر خود را انتخاب کنید.",
  },
  {
    id: "profile",
    title: "پروفایل شما 👤",
    description: "در بخش پروفایل، آمار و پیشرفت خود را ببینید.",
  },
  {
    id: "subscription",
    title: "پلن‌های اشتراک 💎",
    description: "برای دریافت اشتراک از طریق تلگرام با پشتیبانی در ارتباط باشید تا قابلیت‌های پیشرفته برایتان فعال شود.",
  },
];

export function useOnboarding() {
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      setHasCompletedOnboarding(false);
      // Auto-start onboarding for new users after a short delay
      const timer = setTimeout(() => {
        setIsOnboardingActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const startOnboarding = useCallback(() => {
    setCurrentStepIndex(0);
    setIsOnboardingActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      completeOnboarding();
    }
  }, [currentStepIndex]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skipOnboarding = useCallback(() => {
    completeOnboarding();
  }, []);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsOnboardingActive(false);
    setHasCompletedOnboarding(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    setHasCompletedOnboarding(false);
    setCurrentStepIndex(0);
  }, []);

  return {
    isOnboardingActive,
    currentStep: ONBOARDING_STEPS[currentStepIndex],
    currentStepIndex,
    totalSteps: ONBOARDING_STEPS.length,
    hasCompletedOnboarding,
    startOnboarding,
    nextStep,
    prevStep,
    skipOnboarding,
    resetOnboarding,
  };
}
