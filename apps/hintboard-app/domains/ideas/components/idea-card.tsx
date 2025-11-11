"use client";
import React from "react";
import { Badge, Button } from "@hintboard/ui/component";
import { HStack, VStack } from "@hintboard/ui/component";
import { MessageSquare, ArrowBigUp, Lock, Pin, Bug } from "lucide-react";
import {
  IdeasService,
  IdeaWithUserInfo,
  TopicRow,
  UserService,
} from "@hintboard/supabase/services";
import { toast } from "sonner";
import { cn } from "@hintboard/ui/utils";
import { CreatorUser } from "@/shared/creator-user";
import { useQueryClient } from "@tanstack/react-query";

export function IdeaCard({ idea }: { idea: IdeaWithUserInfo }) {
  const [isVoting, setIsVoting] = React.useState(false);
  const [myVote, setMyVote] = React.useState(idea.my_vote || false);
  const [voteCount, setVoteCount] = React.useState(idea.vote_count);
  const queryClient = useQueryClient();

  const handleVoteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isVoting) return;

    setIsVoting(true);
    const wasVoted = myVote;

    // Optimistic UI update
    setMyVote(!wasVoted);
    setVoteCount((prev: any) => (wasVoted ? prev - 1 : prev + 1));

    try {
      // Get or create user auth (will create anonymous if needed)
      const user = await UserService.requireAuth();

      // If a new anonymous user was just created, invalidate the user query
      if (user.justCreated) {
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });

        // Only show welcome toast for newly created anonymous users
        if (user.isAnonymous) {
          toast.success(
            `Welcome, ${user.fullName}! Your vote has been counted.`,
            { duration: 4000 },
          );
        }
      }

      // Perform the vote action
      if (wasVoted) {
        await IdeasService.voteIdea(idea.idea_id, 0, "client");
      } else {
        await IdeasService.voteIdea(idea.idea_id, 1, "client");
      }
    } catch (error: any) {
      console.error("Error voting:", error);
      toast.error("Failed to vote. Please try again.");

      // Revert optimistic update on error
      setMyVote(wasVoted);
      setVoteCount((prev: any) => (wasVoted ? prev + 1 : prev - 1));
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-md transition-all duration-200 overflow-hidden",
        { "border-amber-500/40 bg-amber-500/5": idea.is_pinned },
      )}
    >
      {/* Pinned indicator stripe */}
      {idea.is_pinned && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
      )}

      <VStack gap={5} className="p-5">
        {/* Header Section */}
        <HStack gap={4} align="start" justify="between">
          <CreatorUser
            name={idea.creator_name}
            email={idea.creator_email}
            avatar={idea.creator_avatar}
            organization={idea.creator_organization}
            createdAt={idea.created_at}
            size="md"
            className="flex-1 min-w-0"
          />

          {/* Status Badge */}
          {idea.status_name && (
            <Badge
              variant="secondary"
              className="rounded-full px-3 py-1 text-xs font-medium shadow-sm border flex-shrink-0"
              style={{
                backgroundColor: idea.status_color
                  ? `${idea.status_color}15`
                  : undefined,
                borderColor: idea.status_color
                  ? `${idea.status_color}40`
                  : undefined,
                color: idea.status_color || undefined,
              }}
            >
              {idea.status_name}
            </Badge>
          )}
        </HStack>

        {/* Title Section */}
        <VStack gap={3}>
          <HStack gap={2} align="start">
            <h3 className="text-base font-bold text-foreground leading-tight flex-1">
              {idea.title}
            </h3>
            <HStack gap={1.5} className="flex-shrink-0">
              {/* Show red bug icon if idea is marked as bug */}
              {idea.is_bug && (
                <div className="rounded-full bg-red-500/10 p-1.5">
                  <Bug className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                </div>
              )}

              {idea.is_pinned && (
                <div className="rounded-full bg-amber-500/10 p-1.5">
                  <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                </div>
              )}

              {idea.is_private && (
                <div className="rounded-full bg-muted p-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </HStack>
          </HStack>

          {/* Description */}
          {idea.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {idea.description}
            </p>
          )}
        </VStack>

        {/* Topics */}
        {idea.topics && idea.topics.length > 0 && (
          <HStack gap={1.5} wrap="wrap">
            {idea.topics.map((topic: TopicRow) => (
              <Badge
                key={topic.id}
                variant="outline"
                className="rounded-full px-2.5 py-0.5 text-xs font-normal border-border/60 hover:bg-accent/50 transition-colors"
              >
                {topic.name}
              </Badge>
            ))}
          </HStack>
        )}

        {/* Footer Actions */}
        <HStack
          gap={0}
          align="center"
          justify="between"
          className="pt-3 border-t border-border/30"
        >
          {/* Vote Button */}
          <Button
            variant={myVote ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-9 gap-2 font-semibold transition-all duration-200",
              myVote
                ? "bg-primary hover:bg-primary/90 shadow-sm"
                : "hover:bg-accent",
            )}
            onClick={handleVoteClick}
            disabled={isVoting}
          >
            <ArrowBigUp
              className={cn(
                "w-4 h-4 transition-all duration-200",
                myVote && "fill-current",
              )}
            />
            <span className="text-sm tabular-nums">{voteCount}</span>
            {myVote && <span className="text-xs opacity-90">Voted</span>}
          </Button>

          {/* Comments */}
          <HStack
            gap={2}
            align="center"
            className="px-3 py-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground tabular-nums">
              {idea.comment_count}
            </span>
            <span className="text-xs text-muted-foreground">
              {idea.comment_count === 1 ? "comment" : "comments"}
            </span>
          </HStack>
        </HStack>
      </VStack>
    </div>
  );
}
