"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@hintboard/ui/component";

import { Bell, Plus, Filter, Eye } from "lucide-react";
import {
  AnnouncementsService,
  AnnouncementWithDetails,
} from "@hintboard/supabase/services";
import { format } from "date-fns";
import { useOrganization } from "@/shared/contexts/organizations-context";

export default function AnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<AnnouncementWithDetails[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    "published" | "draft" | undefined
  >();
  const { organization } = useOrganization();

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await AnnouncementsService.getAnnouncementsWithDetails(
        organization.id,
        { status: filterStatus },
        "client",
      );
      setAnnouncements(data);
    } catch (error) {
      console.error("Failed to load announcements:", error);
    } finally {
      setLoading(false);
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
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Subscribe to updates
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Link href={`/announcements/new`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </Link>
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
            <Link href={`/announcements/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create your first announcement
              </Button>
            </Link>
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
                    {/*<span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {announcement.view_count} view
                      {announcement.view_count !== 1 ? "s" : ""}
                    </span>*/}
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
    </div>
  );
}
