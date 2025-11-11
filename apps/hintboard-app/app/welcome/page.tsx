"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
// Hooks
import { useOnboarding } from "@/domains/onboarding/hooks/use-onboarding";
// Provider
import { OnboardingProvider } from "@/domains/onboarding/contexts/onboarding-context";
// Components
import Step1Welcome from "@/domains/onboarding/components/step-1-welcome";
// Services
import { UserService } from "@hintboard/supabase/services";

export default function Onboarding() {
  return (
    <OnboardingProvider totalSteps={1}>
      {/* Render current step content */}
      <OnboardingBody />
    </OnboardingProvider>
  );
}

function OnboardingBody() {
  const { step, completeCurrentStep, next, totalSteps, isStepCompleted } =
    useOnboarding();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleFinish() {
    try {
      setLoading(true);
      completeCurrentStep();
      await UserService.completeUserOnboarding("client");
      router.push("/ideas");
    } catch (e) {
      console.error("Failed to complete onboarding", e);
      // Even if completion fails, redirect to inventory
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    completeCurrentStep();

    const isLastStep = step === totalSteps - 1;

    if (isLastStep) {
      await handleFinish();
    } else {
      next();
    }
  }

  // Render current step
  if (step === 0)
    return <Step1Welcome onContinue={handleContinue} loading={loading} />;

  return null;
}
