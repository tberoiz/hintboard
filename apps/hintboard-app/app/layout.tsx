import type { Metadata } from "next";
import { HintboardProviders } from "./providers";
import { Toaster } from "@hintboard/ui/component";
import { cookies, headers } from "next/headers";
import { OrganizationProvider } from "@/shared/contexts/organizations-context";

import "@hintboard/ui/globals.css";

export const metadata: Metadata = {
  description: "",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();

  const h = await headers();
  const organization = {
    id: h.get("x-organization-id"),
    name: h.get("x-organization-name"),
    slug: h.get("x-organization-slug"),
    role: h.get("x-organization-role"),
    logo: h.get("x-organization-logo"),
    theme: h.get("x-organization-theme"),
  };

  const theme = organization.theme || "system";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>{organization.name ?? ""}</title>

        {/*  If the organization has a logo, use it as favicon */}
        {organization.logo ? (
          <link rel="icon" href={organization.logo} />
        ) : (
          <>
            <link
              rel="icon"
              type="image/svg+xml"
              href="brand/hintboard-icon.svg"
            />
            <link
              rel="alternate icon"
              type="image/png"
              href="brand/hintboard-icon.png"
            />
          </>
        )}
      </head>

      <body>
        <HintboardProviders initialTheme={theme as "light" | "dark" | "system"}>
          <OrganizationProvider organization={organization}>
            {children}
          </OrganizationProvider>
        </HintboardProviders>
        <Toaster />
      </body>
    </html>
  );
}
