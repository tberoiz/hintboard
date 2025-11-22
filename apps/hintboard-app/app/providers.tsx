"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@hintboard/ui/component";
import { SubscriptionLimitsProvider } from "@/shared/contexts/subscription-limits-context";

interface hintboardProvidersProps {
  children: React.ReactNode;
  initialTheme?: "light" | "dark" | "system";
}

export function HintboardProviders({
  children,
  initialTheme = "dark",
}: hintboardProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider
        attribute="class"
        defaultTheme={initialTheme}
        enableSystem
        disableTransitionOnChange
      >
        <SubscriptionLimitsProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </SubscriptionLimitsProvider>
      </NextThemesProvider>
    </QueryClientProvider>
  );
}
