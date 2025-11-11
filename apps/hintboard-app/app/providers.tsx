"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@hintboard/ui/component";

interface hintboardProvidersProps {
  children: React.ReactNode;
  initialTheme?: "light" | "dark" | "system";
}

export function HintboardProviders({
  children,
  initialTheme = "system",
}: hintboardProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  // }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider
        attribute="class"
        defaultTheme={initialTheme}
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>{children}</TooltipProvider>
      </NextThemesProvider>
    </QueryClientProvider>
  );
}
