"use client";
import { useOnboardingContext } from "@/domains/onboarding/contexts/onboarding-context";

export function useOnboarding() {
  return useOnboardingContext();
}
