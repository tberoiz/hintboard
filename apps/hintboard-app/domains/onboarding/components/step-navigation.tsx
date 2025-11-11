"use client";
import React from "react";
import { Button } from "@hintboard/ui/component";
import { useOnboardingContext } from "@/domains/onboarding/contexts/onboarding-context";

export function StepNavigation({
  onFinish,
  finishing,
  finishLabel = "Finish",
}: {
  onFinish?: () => void | Promise<void>;
  finishing?: boolean;
  finishLabel?: string;
}) {
  const { step, totalSteps, next, isStepCompleted } = useOnboardingContext();
  const isLast = step === totalSteps - 1;
  const canProceed = isStepCompleted(step);

  return (
    <div className="p-6">
      {/* Dots */}
      <div className="flex justify-center mb-6 space-x-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${i === step ? "bg-blue-500" : "bg-gray-300"}`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-end">
        {!isLast ? (
          canProceed ? (
            <Button onClick={next}>Next</Button>
          ) : null
        ) : canProceed ? (
          <Button onClick={onFinish} disabled={!!finishing}>
            {finishing ? "Finishing…" : finishLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
