"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  StatusesService,
  TopicsService,
  IdeasService,
  IdeaWithUserInfo,
} from "@hintboard/supabase/services";
import {
  Button,
  HStack,
  VStack,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@hintboard/ui/component";
import { Filter } from "lucide-react";
import { IdeaCard } from "@/features/ideas/components/idea-card";
import { CreateIdeaSheet } from "@/features/ideas/components/sheets/create-idea-sheet";
import { EditIdeaSheet } from "@/features/ideas/components/sheets/edit-idea-sheet";
import IdeasSidebar from "@/features/ideas/components/ideas-sidebar";
import { useOrganization } from "@/shared/contexts/organizations-context";

interface AdminFilters {
  archived: boolean;
  noStatus: boolean;
  bugs: boolean;
  private: boolean;
}

export default function IdeasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = useOrganization();
  const organizationId = organization?.id;
  const userRole = organization?.role || "guest";
  const isAdmin =
    organization?.role === "admin" || organization?.role === "admin";

  // Check if viewing as customer
  const viewAsCustomer = searchParams.get("viewAsCustomer") === "true";

  const [sortBy, setSortBy] = useState<"trending" | "recent">("recent");
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [adminFilters, setAdminFilters] = useState<AdminFilters>({
    archived: false,
    noStatus: false,
    bugs: false,
    private: false,
  });

  // Modal state - controlled by URL query param
  const ideaIdFromUrl = searchParams.get("idea");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  // Sync modal state with URL
  useEffect(() => {
    setSelectedIdeaId(ideaIdFromUrl);
  }, [ideaIdFromUrl]);

  // Fetch statuses with counts
  const { data: statuses = [] } = useQuery({
    queryKey: ["statuses-with-counts", organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error("No organization ID");
      return StatusesService.getStatusesWithCounts(organizationId, "client");
    },
    enabled: !!organizationId,
  });

  // Fetch topics with counts
  const { data: topics = [] } = useQuery({
    queryKey: ["topics-with-counts", organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error("No organization ID");
      return TopicsService.getTopicsWithCounts(organizationId, "client");
    },
    enabled: !!organizationId,
  });

  // Fetch filtered ideas
  const {
    data: ideas = [],
    isLoading: ideasLoading,
    error: ideasError,
  } = useQuery({
    queryKey: [
      "filtered-ideas",
      organizationId,
      selectedStatusId,
      selectedTopicId,
      adminFilters,
    ],
    queryFn: () => {
      if (!organizationId) throw new Error("No organization ID");

      const filters = {
        is_archived: adminFilters.archived ? true : undefined,
        is_bug: adminFilters.bugs ? true : undefined,
        is_private: adminFilters.private ? true : undefined,
        no_status: adminFilters.noStatus ? true : undefined,
      };

      return IdeasService.getFilteredIdeas(
        organizationId,
        selectedStatusId,
        selectedTopicId,
        "client",
        filters,
      );
    },
    enabled: !!organizationId,
  });

  // Get selected idea for modal
  const selectedIdea = useMemo(() => {
    if (!selectedIdeaId) return null;
    return ideas.find((idea) => idea.idea_id === selectedIdeaId) || null;
  }, [selectedIdeaId, ideas]);

  // Filter ideas based on user role
  const filteredIdeas = useMemo(() => {
    if (userRole === "guest") {
      return ideas.filter((idea) => !idea.is_private);
    }
    return ideas;
  }, [ideas, userRole]);

  // Sort ideas with pinned always first
  const sortedIdeas = useMemo(() => {
    return [...filteredIdeas].sort((a, b) => {
      // First, sort by pinned status (pinned items always come first)
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;

      // Then apply the selected sort for non-pinned items
      if (sortBy === "trending") {
        return b.vote_count - a.vote_count;
      } else {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    });
  }, [filteredIdeas, sortBy]);

  // Helper to build URL with preserved viewAsCustomer param
  const buildUrl = (path: string, params?: Record<string, string>) => {
    const url = new URLSearchParams();

    // Add viewAsCustomer if present
    if (viewAsCustomer) {
      url.set("viewAsCustomer", "true");
    }

    // Add additional params
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.set(key, value);
      });
    }

    const queryString = url.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  // Handlers
  const handleStatusSelect = (statusId: string | null) => {
    setSelectedStatusId(statusId);
  };

  const handleTopicSelect = (topicId: string | null) => {
    setSelectedTopicId(topicId);
  };

  const handleAdminFilterToggle = (filter: keyof AdminFilters) => {
    setAdminFilters((prev) => ({
      ...prev,
      [filter]: !prev[filter],
    }));
  };

  const handleSettingsClick = () => {
    router.push(buildUrl("/settings"));
  };

  const handleIdeaClick = (ideaId: string) => {
    // Update URL with query param, preserving viewAsCustomer
    router.push(buildUrl("/ideas", { idea: ideaId }), { scroll: false });
  };

  const handleModalClose = () => {
    // Remove idea param but keep viewAsCustomer
    router.push(buildUrl("/ideas"), { scroll: false });
  };

  const hasActiveAdminFilters = Object.values(adminFilters).some(
    (value) => value === true,
  );

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <IdeasSidebar
        statuses={statuses}
        topics={topics}
        selectedStatusId={selectedStatusId}
        selectedTopicId={selectedTopicId}
        adminFilters={adminFilters}
        isAdmin={isAdmin}
        onStatusSelect={handleStatusSelect}
        onTopicSelect={handleTopicSelect}
        onAdminFilterToggle={handleAdminFilterToggle}
        onSettingsClick={handleSettingsClick}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full h-full p-8">
          <VStack className="max-w-5xl mx-auto px-16" gap={8}>
            {/* Header */}
            <HStack justify="between" align="center">
              <h1 className="text-3xl font-bold">Feature Ideas</h1>
              <CreateIdeaSheet organizationId={organizationId} />
            </HStack>

            {/* Filters and Sort */}
            <HStack justify="between" align="center" gap={4}>
              <HStack gap={4}>
                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as any)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trending">Trending</SelectItem>
                    <SelectItem value="recent">Recent</SelectItem>
                  </SelectContent>
                </Select>
              </HStack>

              {(selectedStatusId ||
                selectedTopicId ||
                hasActiveAdminFilters) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStatusId(null);
                    setSelectedTopicId(null);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </HStack>

            {/* Active Filters */}
            {(selectedStatusId || selectedTopicId || hasActiveAdminFilters) && (
              <HStack gap={2} align="center" className="flex-wrap">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Active filters:</span>
                {selectedStatusId && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                    {statuses.find((s) => s.id === selectedStatusId)?.name}
                  </span>
                )}
                {selectedTopicId && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md">
                    #{topics.find((t) => t.id === selectedTopicId)?.name}
                  </span>
                )}
                {adminFilters.archived && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                    Archived
                  </span>
                )}
                {adminFilters.bugs && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md">
                    Bugs
                  </span>
                )}
                {adminFilters.private && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-md">
                    Private
                  </span>
                )}
                {adminFilters.noStatus && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                    No Status
                  </span>
                )}
              </HStack>
            )}

            {/* Ideas List */}
            {ideasLoading ? (
              <VStack className="text-center py-12 text-gray-500">
                Loading ideas...
              </VStack>
            ) : ideasError ? (
              <VStack className="text-center py-12 text-red-500">
                Error loading ideas
              </VStack>
            ) : sortedIdeas.length === 0 ? (
              <VStack className="text-center py-12 text-gray-500">
                {userRole === "guest" && ideas.length > 0
                  ? "No public ideas available."
                  : "No ideas found. Create your first idea!"}
              </VStack>
            ) : (
              <VStack gap={4}>
                {sortedIdeas.map((idea) => (
                  <div
                    key={idea.idea_id}
                    className="cursor-pointer"
                    onClick={() => handleIdeaClick(idea.idea_id)}
                  >
                    <IdeaCard idea={idea} />
                  </div>
                ))}
              </VStack>
            )}
          </VStack>
        </div>
      </div>

      {/* Modal */}
      {selectedIdea && (
        <EditIdeaSheet
          idea={selectedIdea}
          isOpen={true}
          onOpenChange={(open) => !open && handleModalClose()}
        />
      )}
    </div>
  );
}
