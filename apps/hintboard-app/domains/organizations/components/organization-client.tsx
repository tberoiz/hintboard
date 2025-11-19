"use client";

import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@hintboard/ui/component";
import { Loader2 } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: string;
}

interface OrganizationsClientProps {
  org: Organization;
}

function getInitials(name: string) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function OrganizationsClient({ org }: OrganizationsClientProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSelectOrganization = (slug: string) => {
    setIsRedirecting(true);
    const baseDomain = process.env.NEXT_PUBLIC_APP_URL;
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const url = `${protocol}://${slug}.${baseDomain}/ideas`;

    // Redirect to the organization's subdomain
    window.location.href = url;
  };

  return (
    <button
      onClick={() => handleSelectOrganization(org.slug)}
      disabled={isRedirecting}
      className="w-full flex items-center gap-4 p-6 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={org.logo_url || undefined} alt={org.name} />
        <AvatarFallback className="text-lg">
          {getInitials(org.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 text-left">
        <p className="font-medium">{org.name}</p>
        <p className="text-sm text-muted-foreground capitalize">{org.role}</p>
      </div>
      {isRedirecting && <Loader2 className="h-4 w-4 animate-spin" />}
    </button>
  );
}
