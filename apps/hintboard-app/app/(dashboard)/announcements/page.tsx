"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hintboard/ui/component";

import { Bell, Plus, Filter, ChevronDown, Sparkles } from "lucide-react";
import {
  AnnouncementsService,
  AnnouncementWithDetails,
} from "@hintboard/supabase/services";
import { format } from "date-fns";
import { useOrganization } from "@/shared/contexts/organizations-context";
import { GenerateFromIdeasModal } from "@/domains/announcements/components/generate-from-ideas-modal";

export default function AnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<AnnouncementWithDetails[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    "published" | "draft" | undefined
  >();
  const [filterCategoryId, setFilterCategoryId] = useState<
    string | undefined
  >();
  const [categories, setCategories] = useState<any[]>([]);
  const { organization } = useOrganization();
  const isGuest = organization?.role === "guest";
  const isAdmin = organization?.role === "admin";

  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      loadAnnouncements();
      loadCategories();
    }
  }, [organization?.id, filterStatus, filterCategoryId]);

  const loadCategories = async () => {
    if (!organization?.id) return;

    try {
      const cats = await AnnouncementsService.getCategoriesWithCounts(
        organization.id,
        "client",
      );
      setCategories(cats);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const loadAnnouncements = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);

      // Non-admins should only see published announcements
      const statusFilter = isAdmin ? filterStatus : "published";

      const data = await AnnouncementsService.getAnnouncementsWithDetails(
        organization.id,
        { status: statusFilter, categoryId: filterCategoryId },
        "client",
      );
      setAnnouncements(data);
    } catch (error) {
      console.error("Failed to load announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReaction = async (announcementId: string) => {
    try {
      await AnnouncementsService.toggleReaction(announcementId, "👍", "client");
      loadAnnouncements();
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  const handleGenerate = async (
    responseData: any,
    selectedIdeaIds: string[],
  ) => {
    try {
      console.log("🤖 Generated announcement data:", responseData);

      // The API now returns { title, blocks, ideasProcessed }
      // Extract title and blocks from the response
      const { title, blocks } = responseData;

      if (!title || !blocks) {
        throw new Error("Invalid response format from AI");
      }

      // Add IDs to blocks if they don't have them
      const blocksWithIds = blocks.map((block: any) => ({
        ...block,
        id:
          block.id ||
          `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }));

      // Create the announcement with the structured blocks
      const announcement = await AnnouncementsService.createAnnouncement(
        {
          organization_id: organization.id,
          title: title,
          content: { blocks: blocksWithIds },
          status: "draft",
        },
        "client",
      );

      console.log("✅ Created announcement:", announcement);

      // Redirect to edit page
      router.push(`/announcements/${announcement.id}/edit`);
    } catch (error) {
      console.error("Failed to create announcement:", error);
      throw error;
    }
  };

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Announcements
        </h1>

        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2 ml-auto">
            {/* Category filter - available to all users */}
            {categories.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    {filterCategoryId
                      ? categories.find((c) => c.id === filterCategoryId)
                          ?.name || "Filter"
                      : "All Categories"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => setFilterCategoryId(undefined)}
                    className="cursor-pointer"
                  >
                    All Categories
                  </DropdownMenuItem>
                  {categories.map((category) => (
                    <DropdownMenuItem
                      key={category.id}
                      onClick={() => setFilterCategoryId(category.id)}
                      className="cursor-pointer gap-3"
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="flex-1">{category.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({category.announcement_count})
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!isGuest && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/announcements/new" className="cursor-pointer">
                      Write Manually
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowGenerateModal(true)}
                    className="cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate from Ideas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Announcements List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No announcements yet</p>
            {!isGuest && (
              <Link href={`/announcements/new`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first announcement
                </Button>
              </Link>
            )}
          </div>
        ) : (
          announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className="hover:shadow-md transition-shadow cursor-pointer select-none"
              onClick={() => router.push(`/announcements/${announcement.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-2xl font-semibold">
                        {announcement.title}
                      </CardTitle>
                      {announcement.status === "draft" && (
                        <Badge variant="secondary">(Draft)</Badge>
                      )}
                    </div>

                    {announcement.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {announcement.categories.map((category) => (
                          <Badge
                            key={category.id}
                            style={{
                              backgroundColor: category.color + "20",
                              color: category.color,
                              borderColor: category.color + "40",
                            }}
                            variant="outline"
                          >
                            {category.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {/* Meta information */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {announcement.published_at
                        ? format(
                            new Date(announcement.published_at),
                            "d MMM, yyyy",
                          )
                        : format(
                            new Date(announcement.created_at),
                            "d MMM, yyyy",
                          )}
                    </span>
                  </div>

                  {/* Content preview */}
                  {announcement.content?.content?.[0]?.content?.[0]?.text && (
                    <p className="text-muted-foreground line-clamp-2">
                      {announcement.content.content[0].content[0].text}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Generate from Ideas Modal */}
      {!isGuest && (
        <GenerateFromIdeasModal
          open={showGenerateModal}
          onOpenChange={setShowGenerateModal}
          organizationId={organization?.id}
          organizationName={organization?.name}
          onGenerate={handleGenerate}
          title="Generate Announcement from Ideas"
          description="Select ideas to include in your AI-generated announcement"
          generateButtonText="Generate Announcement"
        />
      )}
    </div>
  );
}
