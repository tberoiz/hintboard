"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Badge,
  Separator,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@hintboard/ui/component";
import { ArrowLeft, Eye, Edit, Trash2 } from "lucide-react";
import {
  AnnouncementsService,
  AnnouncementWithDetails,
  UserService,
} from "@hintboard/supabase/services";
import { format } from "date-fns";
import { useOrganization } from "@/shared/contexts/organizations-context";

// Simple date formatter (fallback if date-fns not available)
const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), "d MMMM, yyyy");
  } catch {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
};

export default function AnnouncementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const announcementId = params?.id as string | undefined;
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  const [announcement, setAnnouncement] =
    useState<AnnouncementWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [hovering, setHovering] = useState(false);
  const isGuest = organization?.role === "guest";

  // Get current user ID
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const u = await UserService.getCurrentUser("client");
      return u?.id || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const currentUserId = currentUser || null;

  const loadAnnouncement = useCallback(async () => {
    if (!announcementId || !organizationId) return;

    try {
      setLoading(true);

      // Load announcement details
      const data = await AnnouncementsService.getAnnouncementsWithDetails(
        organizationId,
        {},
        "client",
      );
      const found = data.find((a) => a.id === announcementId);

      // If guest and announcement is draft, don't show it
      if (found && isGuest && found.status === "draft") {
        setAnnouncement(null);
      } else {
        setAnnouncement(found || null);
      }
    } catch (error) {
      console.error("Failed to load announcement:", error);
    } finally {
      setLoading(false);
    }
  }, [announcementId, organizationId, isGuest]);

  useEffect(() => {
    if (announcementId && organizationId) {
      loadAnnouncement();
    }
  }, [announcementId, organizationId, loadAnnouncement]);

  const handleDelete = async () => {
    if (!announcement) return;
    try {
      await AnnouncementsService.deleteAnnouncement(announcement.id, "client");
      router.push("/announcements");
    } catch (error) {
      console.error("Failed to delete announcement:", error);
    }
  };

  const renderContent = (content: any) => {
    // Handle new blocks format
    if (content?.blocks && Array.isArray(content.blocks)) {
      return content.blocks.map((block: any, index: number) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={index} className="mb-4 leading-7 text-foreground">
                {block.content}
              </p>
            );
          case "h1":
            return (
              <h1 key={index} className="text-3xl font-bold mb-4 mt-6">
                {block.content}
              </h1>
            );
          case "h2":
            return (
              <h2 key={index} className="text-2xl font-semibold mb-3 mt-5">
                {block.content}
              </h2>
            );
          case "bullet-list":
            return (
              <li key={index} className="ml-6 mb-1">
                {block.content}
              </li>
            );
          case "numbered-list":
            return (
              <li key={index} className="ml-6 mb-1 list-decimal">
                {block.content}
              </li>
            );
          case "divider":
            return <hr key={index} className="my-6 border-border" />;
          case "image":
            return (
              <img
                key={index}
                src={block.content}
                alt=""
                className="max-w-full h-auto rounded-lg my-4"
              />
            );
          case "button":
            const buttonStyle = block.buttonStyle || "primary";
            const buttonClasses =
              buttonStyle === "secondary"
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : buttonStyle === "outline"
                  ? "border-2 border-primary text-primary hover:bg-primary/10 bg-transparent"
                  : "bg-primary text-primary-foreground hover:bg-primary/90";

            return (
              <div key={index} className="my-4">
                {block.buttonUrl ? (
                  <a
                    href={block.buttonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-block px-6 py-2 rounded-md font-medium transition-colors ${buttonClasses}`}
                  >
                    {block.content}
                  </a>
                ) : (
                  <button
                    className={`px-6 py-2 rounded-md font-medium transition-colors ${buttonClasses}`}
                  >
                    {block.content}
                  </button>
                )}
              </div>
            );
          default:
            return null;
        }
      });
    }

    // Handle legacy TipTap format
    if (!content?.content) return null;

    return content.content.map((block: any, index: number) => {
      switch (block.type) {
        case "paragraph":
          return (
            <p key={index} className="mb-4 leading-7">
              {block.content
                ?.map((inline: any, i: number) => inline.text)
                .join("")}
            </p>
          );
        case "heading":
          const level = (block.attrs?.level || 1) as 1 | 2 | 3;
          const HeadingTag = `h${level}` as keyof HTMLElementTagNameMap;
          const headingClasses =
            {
              1: "text-3xl font-bold mb-4 mt-6",
              2: "text-2xl font-semibold mb-3 mt-5",
              3: "text-xl font-semibold mb-2 mt-4",
            }[level] || "text-lg font-semibold mb-2 mt-3";

          return (
            <HeadingTag key={index} className={headingClasses}>
              {block.content
                ?.map((inline: any, i: number) => inline.text)
                .join("")}
            </HeadingTag>
          );
        case "bulletList":
          return (
            <ul key={index} className="list-disc pl-6 mb-4 space-y-1">
              {block.content?.map((item: any, i: number) => (
                <li key={i}>
                  {item.content?.[0]?.content
                    ?.map((inline: any) => inline.text)
                    .join("")}
                </li>
              ))}
            </ul>
          );
        case "numberedList":
          return (
            <ol key={index} className="list-decimal pl-6 mb-4 space-y-1">
              {block.content?.map((item: any, i: number) => (
                <li key={i}>
                  {item.content?.[0]?.content
                    ?.map((inline: any) => inline.text)
                    .join("")}
                </li>
              ))}
            </ol>
          );
        case "image":
          return (
            <img
              key={index}
              src={block.attrs?.src}
              alt={block.attrs?.alt || ""}
              className="max-w-full h-auto rounded-lg my-4"
            />
          );
        default:
          return null;
      }
    });
  };

  if (!announcementId || !organizationId) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Invalid announcement</p>
          <Link href="/announcements">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to announcements
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="text-center py-12 text-muted-foreground">
          Loading announcement...
        </div>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {isGuest ? "Announcement not available" : "Announcement not found"}
          </p>
          <Link href="/announcements">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to announcements
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = organization.role != "guest";
  const canEdit = isOwner && !isGuest;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 max-h-full overflow-y-auto scrollbar-hidden ">
      {/* Back button */}
      <Link href="/announcements" className="inline-block mb-6">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          All Announcements
        </Button>
      </Link>

      {/* Header */}
      <div
        className="mb-6 relative"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              {announcement.title}
            </h1>
            {announcement.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
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

          {/* Edit/Delete buttons - shown on hover for admins */}
          {canEdit && (
            <div
              className={`flex gap-2 transition-opacity duration-200 ${
                hovering ? "opacity-100" : "opacity-0"
              }`}
            >
              <Link href={`/announcements/${announcement.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the announcement.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Meta information */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {announcement.published_at
              ? formatDate(announcement.published_at)
              : formatDate(announcement.created_at)}
          </span>
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Content */}
      <div className="prose prose-slate max-w-none mb-8 dark:prose-invert">
        {renderContent(announcement.content)}
      </div>
    </div>
  );
}
