"use client";
import React from "react";
import {
  MessageSquare,
  ChevronUp,
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
import { Avatar, AvatarImage, AvatarFallback } from "@hintboard/ui/component";
import { formatDistanceToNow } from "date-fns";

// Animated number with vertical slide
function AnimatedNumber({
  value,
  isAnimating,
  direction,
}: {
  value: number;
  isAnimating: boolean;
  direction: "up" | "down" | null;
}) {
  const prevValue = direction === "up" ? value - 1 : value + 1;

  return (
    <div className="relative h-4 w-6 overflow-hidden flex justify-center">
      <div
        className={cn(
          "absolute flex flex-col items-center transition-transform duration-150 ease-out",
          !isAnimating && "translate-y-0",
          isAnimating && direction === "up" && "-translate-y-4",
          isAnimating && direction === "down" && "translate-y-4",
        )}
        style={{
          top: isAnimating ? (direction === "up" ? "16px" : "-16px") : "0",
        }}
      >
        <span className="h-4 flex items-center justify-center text-xs font-semibold leading-none">
          {isAnimating ? prevValue : value}
        </span>
        <span className="h-4 flex items-center justify-center text-xs font-semibold leading-none">
          {value}
        </span>
      </div>
    </div>
  );
}

// Helper to get initials
const getInitials = (name?: string, email?: string): string => {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.charAt(0).toUpperCase() || "?";
};

export function IdeaCard({ idea }: { idea: IdeaWithUserInfo }) {
  const [isVoting, setIsVoting] = React.useState(false);
  const [myVote, setMyVote] = React.useState(idea.my_vote || false);
  const [voteCount, setVoteCount] = React.useState(idea.vote_count);
  const queryClient = useQueryClient();

  const [isAnimating, setIsAnimating] = React.useState(false);
  const [direction, setDirection] = React.useState<"up" | "down" | null>(null);

  const handleVoteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isVoting) return;

    setIsVoting(true);
    const wasVoted = myVote;

    setDirection(wasVoted ? "down" : "up");
    setIsAnimating(true);

    setTimeout(() => {
      setIsAnimating(false);
      setDirection(null);
    }, 150);

    setMyVote(!wasVoted);
    setVoteCount((prev: number) => (wasVoted ? prev - 1 : prev + 1));

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

      await IdeasService.voteIdea(idea.idea_id, wasVoted ? 0 : 1, "client");
    } catch (error: any) {
      console.error("Error voting:", error);
      toast.error("Failed to vote. Please try again.");
      setMyVote(wasVoted);
      setVoteCount((prev: number) => (wasVoted ? prev + 1 : prev - 1));
    } finally {
      setIsVoting(false);
    }
  };

  const displayName =
    idea.creator_name || idea.creator_email?.split("@")[0] || "Anonymous";
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), {
    addSuffix: false,
  });

  return (
    <div
      className={cn(
        "group flex items-start gap-3 py-3 px-4 transition-colors cursor-pointer border-b border-border",
        "hover:bg-muted/50",
        idea.is_pinned &&
          "bg-[linear-gradient(to_right,hsl(var(--idea-card-pinned-from)),hsl(var(--idea-card-pinned-via)),hsl(var(--idea-card-pinned-to)))]",
      )}
    >
      {/* Vote Button - GitHub style */}
      <button
        onClick={handleVoteClick}
        disabled={isVoting}
        className={cn(
          "flex flex-col items-center justify-center rounded-md px-2 py-1 min-w-[2.75rem] transition-all border flex-shrink-0",
          myVote
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground hover:border-muted-foreground/40",
        )}
      >
        <ChevronUp
          className={cn(
            "w-4 h-4 transition-transform",
            isAnimating && direction === "up" && "scale-110",
          )}
          strokeWidth={myVote ? 2.5 : 2}
        />
        <AnimatedNumber
          value={voteCount}
          isAnimating={isAnimating}
          direction={direction}
        />
      </button>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* Title row with badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {idea.title}
          </h3>

          {/* Inline badges */}
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

        {/* Meta line */}
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground/80">{displayName}</span>
          <span>·</span>
          <span>{timeAgo} ago</span>

          {idea.topics && idea.topics.length > 0 && (
            <>
              <span>in</span>
              <span className="text-foreground/80 hover:underline">
                {idea.topics.map((t: TopicRow) => t.name).join(", ")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right side - Status & Arrow */}
      <div className="flex items-center gap-3 flex-shrink-0 self-center">
        {/* Comments */}
        {idea.comment_count > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-medium">{idea.comment_count}</span>
          </div>
        )}

        {/* Status Badge */}
        {idea.status_name && (
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: idea.status_color
                ? `${idea.status_color}15`
                : "hsl(var(--muted))",
              color: idea.status_color || "hsl(var(--muted-foreground))",
              borderColor: idea.status_color
                ? `${idea.status_color}30`
                : "hsl(var(--border))",
            }}
          >
            {idea.status_name}
          </span>
        )}

        {/* Arrow icon */}
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}
