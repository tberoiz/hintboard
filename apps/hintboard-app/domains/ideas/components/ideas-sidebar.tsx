import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserService } from "@hintboard/supabase/services";
import { useOrganization } from "@/shared/contexts/organizations-context";
import { UpgradeModal } from "@/domains/billing/components/upgrade-modal";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  ScrollArea,
  Separator,
  Badge,
  Button,
  VStack,
  HStack,
} from "@hintboard/ui/component";
import {
  ListOrdered,
  Hash,
  ChevronDown,
  ChevronRight,
  Archive,
  AlertCircle,
  Lock,
  X,
  Settings2,
} from "lucide-react";
import { cn } from "@hintboard/ui/utils";

interface Status {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  idea_count: number;
}

interface Topic {
  id: string;
  name: string;
  idea_count: number;
}

interface AdminFilters {
  archived: boolean;
  noStatus: boolean;
  bugs: boolean;
  private: boolean;
}

interface IdeasSidebarProps {
  statuses: Status[];
  topics: Topic[];
  selectedStatusId: string | null;
  selectedTopicId: string | null;
  adminFilters: AdminFilters;
  isAdmin: boolean;
  onStatusSelect: (statusId: string | null) => void;
  onTopicSelect: (topicId: string | null) => void;
  onAdminFilterToggle: (filter: keyof AdminFilters) => void;
  onSettingsClick: () => void;
}

export default function IdeasSidebar({
  statuses,
  topics,
  selectedStatusId,
  selectedTopicId,
  adminFilters,
  isAdmin,
  onStatusSelect,
  onTopicSelect,
  onAdminFilterToggle,
  onSettingsClick,
}: IdeasSidebarProps) {
  const [statusesExpanded, setStatusesExpanded] = useState(true);
  const [topicsExpanded, setTopicsExpanded] = useState(true);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(
    null,
  );
  const [isLoadingTrial, setIsLoadingTrial] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const router = useRouter();
  const { organization } = useOrganization();

  // Only show trial info to organization admins
  const isOrgAdmin = organization?.role === "admin";

  // Fetch trial days remaining on mount (only for admins)
  useEffect(() => {
    if (!isOrgAdmin) {
      setIsLoadingTrial(false);
      return;
    }

    const fetchTrialDays = async () => {
      try {
        const days = await UserService.getTrialDaysRemaining("client");

        setTrialDaysRemaining(days);
      } catch (error) {
        console.error("Error fetching trial days:", error);
        setTrialDaysRemaining(null);
      } finally {
        setIsLoadingTrial(false);
      }
    };

    fetchTrialDays();
  }, [isOrgAdmin]);

  const adminFilterItems = [
    { key: "archived" as const, icon: Archive, label: "Archived" },
    { key: "noStatus" as const, icon: AlertCircle, label: "No Status" },
    { key: "bugs" as const, icon: AlertCircle, label: "Bugs" },
    { key: "private" as const, icon: Lock, label: "Private" },
  ];

  return (
    <VStack className="w-80 border-r bg-muted/30 h-full px-4 pt-4">
      <ScrollArea className="flex-1">
        <VStack gap={6} className="p-4">
          {/* Admin Only Section */}
          {isAdmin && (
            <>
              <VStack gap={3}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Admin only
                </h3>
                <VStack gap={1}>
                  {adminFilterItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = adminFilters[item.key];
                    return (
                      <Button
                        key={item.key}
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-2 h-auto py-2",
                          isActive && "font-medium",
                        )}
                        onClick={() => onAdminFilterToggle(item.key)}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {isActive && (
                          <Badge
                            variant="outline"
                            className="ml-auto h-5 w-5 p-0 justify-center rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </VStack>
              </VStack>
              <Separator />
            </>
          )}

          {/* Statuses Section */}
          <Collapsible
            open={statusesExpanded}
            onOpenChange={setStatusesExpanded}
          >
            <VStack gap={3}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto hover:bg-transparent"
                >
                  <HStack gap={2} align="center">
                    <ListOrdered className="h-4 w-4" />
                    <span className="font-semibold text-muted-foreground text-sm">
                      Statuses
                    </span>
                  </HStack>
                  <HStack gap={2} align="center">
                    <div
                      className="p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push("/settings?tab=statuses");
                      }}
                    >
                      <Settings2 className="h-4 w-4" />
                    </div>
                    {statusesExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </HStack>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <VStack gap={1}>
                  {statuses.map((status) => {
                    const isSelected = selectedStatusId === status.id;
                    return (
                      <Button
                        key={status.id}
                        variant={isSelected ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-between h-auto py-2",
                          isSelected && "font-medium",
                        )}
                        style={
                          isSelected
                            ? {
                                backgroundColor: `${status.color}15`,
                                color: status.color,
                              }
                            : undefined
                        }
                        onClick={() =>
                          onStatusSelect(isSelected ? null : status.id)
                        }
                      >
                        <HStack gap={2} align="center">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: status.color,
                              boxShadow: `0 0 0 1px ${status.color}40`,
                            }}
                          />
                          <span>{status.name}</span>
                        </HStack>
                        <Badge variant="secondary" className="text-xs">
                          {status.idea_count}
                        </Badge>
                      </Button>
                    );
                  })}
                </VStack>
              </CollapsibleContent>
            </VStack>
          </Collapsible>

          <Separator />

          {/* Topics Section */}
          <Collapsible open={topicsExpanded} onOpenChange={setTopicsExpanded}>
            <VStack gap={3}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto hover:bg-transparent"
                >
                  <HStack gap={2} align="center">
                    <Hash className="h-4 w-4" />
                    <span className="font-medium text-sm">Topics</span>
                  </HStack>
                  <HStack gap={2} align="center">
                    <div
                      className="p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push("/settings?tab=topics");
                      }}
                    >
                      <Settings2 className="h-4 w-4" />
                    </div>
                    {topicsExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </HStack>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <VStack gap={1}>
                  {topics.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                      No topics yet. Create topics in Settings.
                    </div>
                  ) : (
                    topics.map((topic) => {
                      const isSelected = selectedTopicId === topic.id;
                      return (
                        <Button
                          key={topic.id}
                          variant={isSelected ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-between h-auto py-2",
                            isSelected &&
                              "bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800",
                          )}
                          onClick={() =>
                            onTopicSelect(isSelected ? null : topic.id)
                          }
                        >
                          <HStack gap={2} align="center">
                            <Hash className="h-3 w-3" />
                            <span>{topic.name}</span>
                          </HStack>
                          <Badge variant="secondary" className="text-xs">
                            {topic.idea_count}
                          </Badge>
                        </Button>
                      );
                    })
                  )}
                </VStack>
              </CollapsibleContent>
            </VStack>
          </Collapsible>
        </VStack>
      </ScrollArea>

      {/* Footer - Trial/Subscription Info (Admin Only) */}
      {isOrgAdmin && !isLoadingTrial && trialDaysRemaining !== null && (
        <VStack gap={2} className="p-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {trialDaysRemaining === 1
              ? "1 day remaining"
              : `${trialDaysRemaining} days remaining`}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setUpgradeModalOpen(true)}
          >
            Upgrade now
          </Button>
        </VStack>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        trialDaysRemaining={trialDaysRemaining}
        organizationName={organization?.name}
      />
    </VStack>
  );
}
