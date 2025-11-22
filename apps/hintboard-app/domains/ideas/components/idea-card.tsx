"use client";
import React from "react";
import { HStack, VStack } from "@hintboard/ui/component";
import {
  MessageSquare,
  TrendingUp,
  Lock,
  Pin,
  Bug,
  ArrowRight,
} from "lucide-react";
import {
  IdeasService,
  IdeaWithUserInfo,
  TopicRow,
  UserService,
} from "@hintboard/supabase/services";
import { toast } from "sonner";
import { cn } from "@hintboard/ui/utils";
import { useQueryClient } from "@tanstack/react-query";

export function IdeaCard({ idea }: { idea: IdeaWithUserInfo }) {
  const [isVoting, setIsVoting] = React.useState(false);
  const [myVote, setMyVote] = React.useState(idea.my_vote || false);
  const [voteCount, setVoteCount] = React.useState(idea.vote_count);
  const queryClient = useQueryClient();

  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleVoteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isVoting) return;

    setIsVoting(true);
    const wasVoted = myVote;

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    setMyVote(!wasVoted);
    setVoteCount((prev: any) => (wasVoted ? prev - 1 : prev + 1));

    try {
      const user = await UserService.requireAuth();

      if (user.justCreated) {
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });

        if (user.isAnonymous) {
          toast.success(
            `Welcome, ${user.fullName}! Your vote has been counted.`,
            { duration: 4000 },
          );
        }
      }

      if (wasVoted) {
        await IdeasService.voteIdea(idea.idea_id, 0, "client");
      } else {
        await IdeasService.voteIdea(idea.idea_id, 1, "client");
      }
    } catch (error: any) {
      console.error("Error voting:", error);
      toast.error("Failed to vote. Please try again.");

      setMyVote(wasVoted);
      setVoteCount((prev: any) => (wasVoted ? prev + 1 : prev - 1));
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div
      className={cn(
        "group rounded-xl p-4 flex items-center justify-between transition-all cursor-pointer border",
        idea.is_pinned
          ? "bg-[linear-gradient(to_right,hsl(var(--idea-card-pinned-from)),hsl(var(--idea-card-pinned-via)),hsl(var(--idea-card-pinned-to)))] border-[hsl(var(--idea-card-pinned-border))] hover:border-[hsl(var(--idea-card-pinned-border-hover))] hover:shadow-sm"
          : "bg-card border-border hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm",
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Vote Button */}
        <button
          onClick={handleVoteClick}
          disabled={isVoting}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg px-3 py-2 border min-w-[3rem] flex-shrink-0 transition-all",
            myVote
              ? "bg-[hsl(var(--idea-card-vote-bg))] border-[hsl(var(--idea-card-vote-border))] shadow-sm"
              : "bg-[hsl(var(--idea-card-vote-inactive-bg))] border-[hsl(var(--idea-card-vote-inactive-border))] hover:bg-[hsl(var(--idea-card-vote-inactive-bg-hover))] hover:border-[hsl(var(--idea-card-vote-inactive-border-hover))]",
          )}
        >
          <TrendingUp
            className={cn(
              "w-4 h-4 mb-0.5",
              myVote
                ? "text-[hsl(var(--idea-card-vote-icon))]"
                : "text-[hsl(var(--idea-card-vote-inactive-icon))]",
            )}
          />
          <span
            className={cn(
              "text-xs font-semibold",
              myVote
                ? "text-[hsl(var(--idea-card-vote-text))]"
                : "text-[hsl(var(--idea-card-vote-inactive-text))]",
            )}
          >
            {voteCount}
          </span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-foreground truncate">
              {idea.title}
            </p>
            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {idea.is_bug && (
                <div className="rounded-full bg-[hsl(var(--idea-card-badge-bug-bg))] p-1 border border-[hsl(var(--idea-card-badge-bug-border))]">
                  <Bug className="w-3 h-3 text-[hsl(var(--idea-card-badge-bug-icon))]" />
                </div>
              )}
              {idea.is_pinned && (
                <div className="rounded-full bg-[hsl(var(--idea-card-badge-pin-bg))] p-1 border border-[hsl(var(--idea-card-badge-pin-border))]">
                  <Pin className="w-3 h-3 text-[hsl(var(--idea-card-badge-pin-icon))]" />
                </div>
              )}
              {idea.is_private && (
                <div className="rounded-full bg-[hsl(var(--idea-card-badge-private-bg))] p-1 border border-[hsl(var(--idea-card-badge-private-border))]">
                  <Lock className="w-3 h-3 text-[hsl(var(--idea-card-badge-private-icon))]" />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              {idea.comment_count}
            </span>
            {idea.topics && idea.topics.length > 0 && (
              <>
                <span>•</span>
                <span className="truncate">
                  {idea.topics.map((t: TopicRow) => t.name).join(", ")}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {idea.status_name && (
          <span
            className="px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: idea.status_color
                ? `${idea.status_color}15`
                : "rgb(243, 244, 246)",
              color: idea.status_color || "rgb(75, 85, 99)",
              borderColor: idea.status_color
                ? `${idea.status_color}30`
                : "rgb(229, 231, 235)",
            }}
          >
            {idea.status_name}
          </span>
        )}
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}
