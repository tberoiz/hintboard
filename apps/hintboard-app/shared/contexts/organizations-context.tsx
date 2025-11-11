"use client";

import { OrganizationWithRole } from "@hintboard/supabase/services";
import { createContext, useContext, ReactNode } from "react";

interface OrganizationContextType {
  organization: OrganizationWithRole | null;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined,
);

export function OrganizationProvider({
  children,
  organization,
  isLoading = false,
}: {
  children: ReactNode;
  organization: OrganizationWithRole;
  isLoading?: boolean;
}) {
  return (
    <OrganizationContext.Provider value={{ organization, isLoading }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return context;
}
