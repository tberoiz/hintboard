"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type OnboardingContextValue = {
  step: number;
  totalSteps: number;
  completed: boolean[];
  next: () => void;
  back: () => void;
  goTo: (n: number) => void;
  completeStep: (n: number) => void;
  completeCurrentStep: () => void;
  isStepCompleted: (n: number) => boolean;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  totalSteps = 3,
  children,
}: {
  totalSteps?: number;
  children: React.ReactNode;
}) {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(() =>
    Array.from({ length: totalSteps }, () => false),
  );

  const next = useCallback(
    () => setStep((s) => Math.min(s + 1, totalSteps - 1)),
    [totalSteps],
  );
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);
  const goTo = useCallback(
    (n: number) => setStep(() => Math.max(0, Math.min(n, totalSteps - 1))),
    [totalSteps],
  );

  const completeStep = useCallback((n: number) => {
    setCompleted((prev) => {
      const copy = [...prev];
      if (n >= 0 && n < copy.length) copy[n] = true;
      return copy;
    });
  }, []);

  const completeCurrentStep = useCallback(() => {
    setCompleted((prev) => {
      const copy = [...prev];
      if (step >= 0 && step < copy.length) copy[step] = true;
      return copy;
    });
  }, [step]);

  const isStepCompleted = useCallback(
    (n: number) => completed[n] === true,
    [completed],
  );

  const value = useMemo<OnboardingContextValue>(
    () => ({
      step,
      totalSteps,
      completed,
      next,
      back,
      goTo,
      completeStep,
      completeCurrentStep,
      isStepCompleted,
    }),
    [
      step,
      totalSteps,
      completed,
      next,
      back,
      goTo,
      completeStep,
      completeCurrentStep,
      isStepCompleted,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const ctx = useContext(OnboardingContext);
  if (!ctx)
    throw new Error(
      "useOnboardingContext must be used within OnboardingProvider",
    );
  return ctx;
}
