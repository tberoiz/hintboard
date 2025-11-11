"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  CardTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Stack,
  HStack,
  VStack,
} from "@hintboard/ui/component";
import {
  FileText,
  MessageSquare,
  Bug,
  Lock,
  ThumbsUp,
  Pin,
} from "lucide-react";
import { IdeaWithUserInfo } from "@hintboard/supabase/services";
import { cn } from "@hintboard/ui/utils";

interface RoadmapCardProps {
  idea: IdeaWithUserInfo;
  canDrag: boolean;
  isDragging?: boolean;
  onClick?: () => void;
}

export function RoadmapCard({
  idea,
  canDrag,
  isDragging = false,
  onClick,
}: RoadmapCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: idea.idea_id,
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
  };

  const shouldShowDragging = isDragging || isSortableDragging;
  const dragHandlers = canDrag ? { ...attributes, ...listeners } : {};

  const handleClick = (e: React.MouseEvent) => {
    if (!isSortableDragging && onClick) onClick();
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...dragHandlers}
      onClick={handleClick}
      className={cn(
        "w-full rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm select-none",
        canDrag
          ? "cursor-grab active:cursor-grabbing hover:bg-card/70 transition-colors"
          : "cursor-pointer hover:bg-card/70 transition-colors",
        shouldShowDragging && "opacity-40",
      )}
    >
      <VStack gap={0} className="w-full">
        {/* Header with title */}
        <HStack
          justify="between"
          align="start"
          gap={2}
          className="px-4 pt-3 pb-2"
        >
          <CardTitle className="text-sm font-medium line-clamp-2 flex-1">
            {idea.title}
          </CardTitle>
        </HStack>

        {/* Topics section */}
        {Array.isArray(idea.topics) && idea.topics.length > 0 && (
          <HStack
            gap={2}
            wrap="wrap"
            className="px-4 pb-2 text-sm text-muted-foreground"
          >
            {idea.topics.map((topic: any) => (
              <HStack key={topic.id} gap={1} align="center">
                <span>#{topic.name}</span>
                {topic.emoji && <span>{topic.emoji}</span>}
              </HStack>
            ))}
          </HStack>
        )}

        {/* Status indicators */}
        <HStack gap={1.5} className="px-4 pb-2">
          {idea.is_bug && (
            <div className="rounded-full bg-red-500/10 p-1.5">
              <Bug className="w-3.5 h-3.5 text-red-600" />
            </div>
          )}
          {idea.is_private && (
            <div className="rounded-full bg-muted p-1.5">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
        </HStack>

        {/* Footer with avatar and stats */}
        <HStack justify="between" align="center" className="px-4 pb-3 pt-1">
          <Avatar className="h-5 w-5">
            {idea.creator_avatar && (
              <AvatarImage src={idea.creator_avatar} alt={idea.creator_name} />
            )}
            <AvatarFallback className="text-xs">
              {idea.creator_name?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          <HStack
            gap={3}
            align="center"
            className="text-muted-foreground text-xs"
          >
            {Array.isArray(idea.attachments) && idea.attachments.length > 0 && (
              <HStack gap={1} align="center">
                <FileText className="w-3.5 h-3.5" />
                <span>{idea.attachments.length}</span>
              </HStack>
            )}
            {idea.comment_count > 0 && (
              <HStack gap={1} align="center">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{idea.comment_count}</span>
              </HStack>
            )}
            {idea.vote_count > 0 && (
              <HStack
                gap={1}
                align="center"
                className="px-2 py-0.5 rounded border border-border/50 bg-background/50"
              >
                <ThumbsUp
                  className="w-3.5 h-3.5"
                  fill={idea.my_vote ? "currentColor" : "none"}
                />
                <span>{idea.vote_count}</span>
              </HStack>
            )}
          </HStack>
        </HStack>
      </VStack>
    </Card>
  );
}
