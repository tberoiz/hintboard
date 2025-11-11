"use client";
import React from "react";
import { useOnboarding } from "@/domains/onboarding/hooks/use-onboarding";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

function maxWidthToClass(size: MaxWidth) {
  switch (size) {
    case "sm":
      return "max-w-xl";
    case "md":
      return "max-w-2xl";
    case "lg":
      return "max-w-4xl";
    case "xl":
      return "max-w-6xl";
    case "2xl":
      return "max-w-7xl";
    case "full":
      return "max-w-none";
    default:
      return "max-w-2xl";
  }
}

export function StepWrapper({
  title,
  children,
  showDots = true,
  maxWidth = "md",
  contentClassName,
  centerContent = true,
  textCenter = true,
}: {
  title?: string;
  children: React.ReactNode;
  showDots?: boolean;
  maxWidth?: MaxWidth;
  contentClassName?: string;
  centerContent?: boolean;
  textCenter?: boolean;
}) {
  const { step, totalSteps } = useOnboarding();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className={`flex-1 flex flex-col items-center ${centerContent ? "justify-center" : "justify-start"} p-6 pb-10 ${textCenter ? "text-center" : "text-left"}`}
      >
        {title ? (
          <h1 className="text-3xl font-light text-foreground">{title}</h1>
        ) : null}
        <div
          className={`mt-4 w-full ${maxWidthToClass(maxWidth)} ${contentClassName ?? ""}`}
        >
          {children}
        </div>
      </div>
      {showDots && (
        <div className="flex justify-center mb-10 space-x-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i === step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
