"use client";

import React, { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
  Badge,
  ScrollArea,
  VStack,
  HStack,
  Separator,
} from "@hintboard/ui/component";
import { Bell, X, ExternalLink } from "lucide-react";
import { cn } from "@hintboard/ui/utils";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  published_at: string;
  is_pinned: boolean;
  categories: Category[];
}

interface AnnouncementsWidgetProps {
  organizationId: string;
  apiKey?: string;
  position?: "left" | "right";
  maxHeight?: string;
  className?: string;
  buttonClassName?: string;
  onAnnouncementClick?: (announcement: Announcement) => void;
}

export function AnnouncementsWidget({
  organizationId,
  apiKey,
  position = "right",
  maxHeight = "600px",
  className,
  buttonClassName,
  onAnnouncementClick,
}: AnnouncementsWidgetProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch announcements
  useEffect(() => {
    fetchAnnouncements();
  }, [organizationId]);

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/public/announcements?organizationId=${organizationId}`,
        {
          headers: apiKey ? { "X-API-Key": apiKey } : {},
        },
      );

      if (!response.ok) throw new Error("Failed to fetch announcements");

      const data = await response.json();
      setAnnouncements(data);

      // Calculate unread count (announcements from last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const unread = data.filter(
        (a: Announcement) =>
          new Date(a.published_at) > sevenDaysAgo && !isAnnouncementRead(a.id),
      );
      setUnreadCount(unread.length);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isAnnouncementRead = (id: string) => {
    const readIds = JSON.parse(
      localStorage.getItem(`hintboard_read_announcements_${organizationId}`) ||
        "[]",
    );
    return readIds.includes(id);
  };

  const markAsRead = (id: string) => {
    const readIds = JSON.parse(
      localStorage.getItem(`hintboard_read_announcements_${organizationId}`) ||
        "[]",
    );
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem(
        `hintboard_read_announcements_${organizationId}`,
        JSON.stringify(readIds),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = () => {
    const allIds = announcements.map((a) => a.id);
    localStorage.setItem(
      `hintboard_read_announcements_${organizationId}`,
      JSON.stringify(allIds),
    );
    setUnreadCount(0);
  };

  const handleAnnouncementClick = (announcement: Announcement) => {
    markAsRead(announcement.id);
    if (onAnnouncementClick) {
      onAnnouncementClick(announcement);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", buttonClassName)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className={cn("w-[400px] p-0", className)}
        align={position === "right" ? "end" : "start"}
        sideOffset={8}
      >
        <VStack gap={0}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h3 className="font-semibold">Announcements</h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 px-2">
                  {unreadCount}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={markAllAsRead}
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* Content */}
          <ScrollArea style={{ maxHeight }} className="flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading announcements...
              </div>
            ) : announcements.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No announcements yet</p>
              </div>
            ) : (
              <VStack gap={0}>
                {announcements.map((announcement, index) => {
                  const isRead = isAnnouncementRead(announcement.id);
                  return (
                    <React.Fragment key={announcement.id}>
                      <div
                        className={cn(
                          "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                          !isRead && "bg-blue-50/50 dark:bg-blue-950/20",
                        )}
                        onClick={() => handleAnnouncementClick(announcement)}
                      >
                        <VStack gap={2} align="start">
                          {/* Title and badge */}
                          <HStack
                            justify="between"
                            align="start"
                            className="w-full"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {!isRead && (
                                <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                              )}
                              <h4
                                className={cn(
                                  "font-medium text-sm flex-1",
                                  !isRead && "text-blue-900 dark:text-blue-100",
                                )}
                              >
                                {announcement.title}
                              </h4>
                            </div>
                            {announcement.is_pinned && (
                              <Badge variant="secondary" className="text-xs">
                                Pinned
                              </Badge>
                            )}
                          </HStack>

                          {/* Content preview */}
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {announcement.content}
                          </p>

                          {/* Categories and date */}
                          <HStack
                            justify="between"
                            align="center"
                            className="w-full"
                          >
                            <HStack gap={2}>
                              {announcement.categories.map((category) => (
                                <Badge
                                  key={category.id}
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    borderColor: category.color,
                                    color: category.color,
                                  }}
                                >
                                  {category.name}
                                </Badge>
                              ))}
                            </HStack>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(announcement.published_at)}
                            </span>
                          </HStack>
                        </VStack>
                      </div>
                      {index < announcements.length - 1 && <Separator />}
                    </React.Fragment>
                  );
                })}
              </VStack>
            )}
          </ScrollArea>

          {/* Footer */}
          {announcements.length > 0 && (
            <div className="border-t p-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => {
                  window.open(
                    `https://your-app.com/announcements/${organizationId}`,
                    "_blank",
                  );
                }}
              >
                View all announcements
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}
        </VStack>
      </PopoverContent>
    </Popover>
  );
}
