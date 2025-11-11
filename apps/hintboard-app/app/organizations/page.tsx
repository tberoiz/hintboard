"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { OrganizationService, UserService } from "@hintboard/supabase/services";
import {
  Card,
  CardContent,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@hintboard/ui/component";
import { Plus, Loader2 } from "lucide-react";

import Link from "next/link";
import { NavUser } from "@/shared/layouts/header/nav-user";
import { HintboardIcon } from "@/shared/icons/icons";

// Helper to get initials from company name
function getInitials(name: string) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch current user - don't use staleTime so it always refetches on mount
  const { data: userInfo, isLoading: userLoading } = useQuery({
    queryKey: ["userInfo"],
    queryFn: () => UserService.getUserInfo("client"),
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch user's organizations - will only run when userInfo is loaded
  const {
    data: organizations = [],
    isLoading: orgsLoading,
    isFetching: orgsFetching,
    refetch: refetchOrgs,
  } = useQuery({
    queryKey: ["user-organizations", userInfo?.id],
    queryFn: async () => {
      if (!userInfo?.id) {
        console.log("No user ID available");
        return [];
      }
      console.log("Fetching organizations for user:", userInfo.id);
      const orgs = await OrganizationService.getUserOrganizations(
        userInfo.id,
        "client",
      );
      console.log("Organizations fetched:", orgs);
      return orgs;
    },
    enabled: !!userInfo?.id, // Only fetch when we have a user ID
    retry: 3,
    retryDelay: 1000,
    staleTime: 0, // Always refetch on mount
  });

  const handleSelectOrganization = (slug: string) => {
    setIsRedirecting(true);
    const baseDomain = process.env.NEXT_PUBLIC_APP_URL || "localhost:3000";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const url = `${protocol}://${slug}.${baseDomain}/ideas`;

    // Redirect to the organization's subdomain
    window.location.href = url;
  };

  // Show loading state while either query is loading
  const isLoading = userLoading || (orgsLoading && !!userInfo?.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary">
            <HintboardIcon />
          </Link>
          <NavUser />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold mb-2">Choose your company</h1>
          <p className="text-muted-foreground">
            Select a company or create a new one
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Organizations List */}
            <Card className="mb-6">
              <CardContent className="p-0">
                {!userInfo ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Unable to load user information.</p>
                    <Button
                      variant="link"
                      onClick={() => window.location.reload()}
                      className="mt-2"
                    >
                      Reload page
                    </Button>
                  </div>
                ) : organizations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>You don't have any companies yet.</p>
                    <p className="text-sm mt-2">Create your first one below!</p>
                    {orgsFetching && (
                      <div className="flex items-center justify-center mt-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => handleSelectOrganization(org.slug)}
                        disabled={isRedirecting}
                        className="w-full flex items-center gap-4 p-6 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={org.logo_url || undefined}
                            alt={org.name}
                          />
                          <AvatarFallback className="text-lg">
                            {getInitials(org.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {org.role}
                          </p>
                        </div>
                        {isRedirecting && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Create New Company Button */}
            <div className="text-center">
              <Button
                variant="link"
                onClick={() => router.push("/organizations/new")}
                disabled={isRedirecting}
                className="text-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create new company
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
