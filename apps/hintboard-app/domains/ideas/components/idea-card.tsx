"use client";
import React from "react";
import { Badge, Button } from "@hintboard/ui/component";
import { HStack, VStack } from "@hintboard/ui/component";
import { MessageSquare, TrendingUp, Lock, Pin, Bug } from "lucide-react";
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
        "group relative rounded-lg border border-border/50 bg-card hover:border-border hover:shadow-sm transition-all duration-200 overflow-hidden",
        { "border-amber-500/40 bg-amber-500/5": idea.is_pinned },
      )}
    >
      {/* Status indicator stripe - colored top border */}
      {idea.status_color && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: idea.status_color }}
        />
      )}

      <HStack gap={4} align="start" className="p-4">
        {/* Vote Button - Left Side */}
        <Button
          variant={myVote ? "default" : "outline"}
          size="sm"
          className={cn(
            "flex-col h-16 w-16 gap-1 rounded-lg flex-shrink-0 transition-all duration-200",
            myVote
              ? "bg-primary hover:bg-primary/90"
              : "hover:bg-accent border-border/60",
          )}
          onClick={handleVoteClick}
          disabled={isVoting}
        >
          <TrendingUp
            className={cn(
              "w-4 h-4 transition-all duration-200",
              myVote && "fill-current",
            )}
          />
          <span className="text-lg font-bold tabular-nums">{voteCount}</span>
          <span className="text-[10px] opacity-70">
            {myVote ? "Voted" : "Vote"}
          </span>
        </Button>

        {/* Content Section */}
        <VStack gap={2} className="flex-1 min-w-0">
          {/* Header with User Info and Status Badge */}
          <HStack gap={3} align="center" justify="between">
            <CreatorUser
              name={idea.creator_name}
              email={idea.creator_email}
              avatar={idea.creator_avatar}
              organization={idea.creator_organization}
              createdAt={idea.created_at}
              size="sm"
              className="flex-1 min-w-0"
            />

            {/* Status Badge */}
            {idea.status_name && (
              <Badge
                variant="secondary"
                className="rounded-full px-2.5 py-0.5 text-xs font-medium border flex-shrink-0"
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

          {/* Title and Icons */}
          <HStack gap={2} align="start">
            <h3 className="text-base font-semibold text-foreground leading-snug flex-1">
              {idea.title}
            </h3>
            <HStack gap={1} className="flex-shrink-0">
              {idea.is_bug && (
                <div className="rounded-md bg-red-500/10 p-1">
                  <Bug className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                </div>
              )}

              {idea.is_pinned && (
                <div className="rounded-md bg-amber-500/10 p-1">
                  <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                </div>
              )}

              {idea.is_private && (
                <div className="rounded-md bg-muted p-1">
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

          {/* Topics and Comments Footer */}
          <HStack gap={3} align="center" justify="between" className="pt-1">
            {/* Topics */}
            {idea.topics && idea.topics.length > 0 && (
              <HStack gap={1.5} wrap="wrap" className="flex-1">
                {idea.topics.map((topic: TopicRow) => (
                  <Badge
                    key={topic.id}
                    variant="outline"
                    className="rounded-full px-2 py-0 text-xs font-normal border-border/60 hover:bg-accent/50 transition-colors"
                  >
                    {topic.name}
                  </Badge>
                ))}
              </HStack>
            )}

            {/* Comments */}
            <HStack
              gap={1.5}
              align="center"
              className="text-muted-foreground flex-shrink-0"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium tabular-nums">
                {idea.comment_count}
              </span>
              <span className="text-xs">
                {idea.comment_count === 1 ? "comment" : "comments"}
              </span>
            </HStack>
          </HStack>
        </VStack>
      </HStack>
    </div>
  );
}
