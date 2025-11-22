"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useOrganization } from "@/shared/contexts/organizations-context";
import { useQuery } from "@tanstack/react-query";
import { UserService } from "@hintboard/supabase/services";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@hintboard/ui/component";
import {
  Hash,
  ListOrdered,
  Users,
  Settings as SettingsIcon,
  Tag,
  User,
  MessageSquare,
  CreditCard,
} from "lucide-react";
import { InviteUsersSection } from "@/features/settings/components/invite-user-section";
import { StatusesSection } from "@/features/settings/components/statuses-section";
import { TopicsSection } from "@/features/settings/components/topics-selection";
import { OrganizationGeneralSection } from "@/features/settings/components/organization-general-section";
import { AnnouncementCategoriesSection } from "@/domains/settings/components/announcement-categories-section";
import { ProfileSection } from "@/features/settings/components/profile-section";
import { MyContentSection } from "@/features/settings/components/my-content-section";
import { BillingSection } from "@/features/settings/components/billing-section";
import { OrganizationRole } from "@hintboard/supabase/services";

// Define which tabs are available for each role
const ROLE_PERMISSIONS: Record<OrganizationRole, string[]> = {
  admin: [
    "general",
    "statuses",
    "topics",
    "categories",
    "billing",
    "invites",
    "profile",
    "content",
  ],
  moderator: ["profile", "content"],
  viewer: ["profile", "content"],
  guest: ["profile", "content"],
};

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { organization: contextOrganization } = useOrganization();

  const organizationId = contextOrganization?.id;
  const userRole = (contextOrganization?.role || "guest") as OrganizationRole;

  // Check if user is anonymous
  const { data: userInfo, isLoading: userLoading } = useQuery({
    queryKey: ["userInfo"],
    queryFn: () => UserService.getUserInfo("client"),
  });

  const isAnonymous = userInfo?.isAnonymous || false;

  // Get allowed tabs for current role
  const allowedTabs = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.guest;

  // Get tab from URL or use first allowed tab as default
  const tabFromUrl = searchParams.get("tab");
  const defaultTab = allowedTabs[0] || "profile";
  const activeTab =
    tabFromUrl && allowedTabs.includes(tabFromUrl) ? tabFromUrl : defaultTab;

  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Set default tab in URL if none is specified
  useEffect(() => {
    if (!tabFromUrl && allowedTabs.length > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", defaultTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [tabFromUrl, allowedTabs, defaultTab, pathname, searchParams, router]);

  // Helper to check if tab is allowed
  const isTabAllowed = (tabName: string) => allowedTabs.includes(tabName);

  // Helper to check if user has admin privileges
  const isAdmin = userRole === "admin";

  // Show loading state
  if (userLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12 text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-8 flex-shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          {isAnonymous
            ? "Create your account to save your data permanently."
            : isAdmin
              ? "Manage your workspace settings and invite new users."
              : "Manage your profile and preferences."}
        </p>
        {contextOrganization && (
          <p className="text-xs text-muted-foreground mt-2">
            Current workspace:{" "}
            <span className="font-medium">{contextOrganization.name}</span>
            {" • "}
            <span className="capitalize">{userRole}</span>
          </p>
        )}
      </div>

      {/* Tabs Layout */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex gap-8 flex-1 min-h-0"
      >
        {/* Left Sidebar - Tabs List */}
        <aside className="w-64 flex-shrink-0">
          <div className="sticky top-6">
            <TabsList className="flex flex-col h-auto w-full bg-transparent space-y-1">
              {/* Admin/Owner Tabs */}
              {isTabAllowed("general") && (
                <TabsTrigger
                  value="general"
                  className="w-full justify-start px-4 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <SettingsIcon className="h-4 w-4 mr-3" />
                  General
                </TabsTrigger>
              )}

              {isTabAllowed("statuses") && (
                <TabsTrigger
                  value="statuses"
                  className="w-full justify-start px-4 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <ListOrdered className="h-4 w-4 mr-3" />
                  Statuses
                </TabsTrigger>
              )}

              {isTabAllowed("topics") && (
                <TabsTrigger
                  value="topics"
                  className="w-full justify-start px-4 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <Hash className="h-4 w-4 mr-3" />
                  Topics
                </TabsTrigger>
              )}

              {isTabAllowed("categories") && (
                <TabsTrigger
                  value="categories"
                  className="w-full justify-start px-4 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <Tag className="h-4 w-4 mr-3" />
                  Announcement Categories
                </TabsTrigger>
              )}

              {isTabAllowed("billing") && (
                <TabsTrigger
                  value="billing"
                  className="w-full justify-start px-4 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <CreditCard className="h-4 w-4 mr-3" />
                  Billing
                </TabsTrigger>
              )}

              {isTabAllowed("invites") && (
                <TabsTrigger
                  value="invites"
                  className="w-full justify-start px-4 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <Users className="h-4 w-4 mr-3" />
                  Invite Users
                </TabsTrigger>
              )}

              {/* Divider */}
              {isAdmin && (
                <div className="py-2">
                  <div className="h-px bg-border" />
                </div>
              )}

              {/* User Tabs */}
              {isTabAllowed("profile") && (
                <TabsTrigger
                  value="profile"
                  className="w-full justify-start px-4 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <User className="h-4 w-4 mr-3" />
                  Profile
                </TabsTrigger>
              )}

              {isTabAllowed("content") && (
                <TabsTrigger
                  value="content"
                  className="w-full justify-start px-4 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <MessageSquare className="h-4 w-4 mr-3" />
                  My Content
                </TabsTrigger>
              )}
            </TabsList>
          </div>
        </aside>

        {/* Right Content Area - Scrollable */}
        <main className="flex-1 min-w-0 overflow-y-auto pr-2">
          {/* Admin Tabs Content */}
          {isTabAllowed("general") && (
            <TabsContent value="general" className="mt-0 space-y-6">
              {organizationId && (
                <>
                  <OrganizationGeneralSection organizationId={organizationId} />
                </>
              )}
            </TabsContent>
          )}

          {isTabAllowed("statuses") && (
            <TabsContent value="statuses" className="mt-0">
              {organizationId && (
                <StatusesSection organizationId={organizationId} />
              )}
            </TabsContent>
          )}

          {isTabAllowed("topics") && (
            <TabsContent value="topics" className="mt-0">
              {organizationId && (
                <TopicsSection organizationId={organizationId} />
              )}
            </TabsContent>
          )}

          {isTabAllowed("categories") && (
            <TabsContent value="categories" className="mt-0">
              {organizationId && (
                <AnnouncementCategoriesSection
                  organizationId={organizationId}
                />
              )}
            </TabsContent>
          )}

          {isTabAllowed("billing") && (
            <TabsContent value="billing" className="mt-0">
              {organizationId && (
                <BillingSection organizationId={organizationId} />
              )}
            </TabsContent>
          )}

          {isTabAllowed("invites") && (
            <TabsContent value="invites" className="mt-0">
              {organizationId && (
                <InviteUsersSection organizationId={organizationId} />
              )}
            </TabsContent>
          )}

          {/* User Tabs Content */}
          {isTabAllowed("profile") && (
            <TabsContent value="profile" className="mt-0">
              <ProfileSection userInfo={userInfo} />
            </TabsContent>
          )}

          {isTabAllowed("content") && (
            <TabsContent value="content" className="mt-0">
              <MyContentSection organizationId={organizationId} />
            </TabsContent>
          )}
        </main>
      </Tabs>
    </div>
  );
}
