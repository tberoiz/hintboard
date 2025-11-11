"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
} from "@hintboard/ui/component";
import { MessageSquare, ThumbsUp, Lightbulb, Loader2 } from "lucide-react";
import {
  IdeasService,
  UserService,
  CommentsService,
} from "@hintboard/supabase/services";

interface MyContentSectionProps {
  organizationId?: string;
}

// Simple time ago function
function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [name, secondsInInterval] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInInterval);
    if (interval >= 1) {
      return `${interval} ${name}${interval > 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
}

export function MyContentSection({ organizationId }: MyContentSectionProps) {
  const [activeTab, setActiveTab] = useState("ideas");

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => UserService.getUserInfo("client"),
  });

  // Fetch all ideas
  const { data: allIdeas = [], isLoading } = useQuery({
    queryKey: ["ideas", organizationId],
    queryFn: () =>
      organizationId
        ? IdeasService.getVisibleIdeas(organizationId, "client")
        : Promise.resolve([]),
    enabled: !!organizationId,
  });

  // Fetch all comments for ideas in this org to find user's comments
  const { data: allComments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ["all-comments", organizationId, currentUser?.id],
    queryFn: async () => {
      if (!organizationId || !currentUser?.id) return [];

      // Fetch comments for all ideas
      const commentsPromises = allIdeas.map((idea) =>
        CommentsService.getIdeaComments(idea.idea_id, "client"),
      );

      const allIdeaComments = await Promise.all(commentsPromises);
      return allIdeaComments.flat();
    },
    enabled: !!organizationId && !!currentUser?.id && allIdeas.length > 0,
  });

  // Filter user's ideas - only ideas created by the current user
  const myIdeas = allIdeas.filter(
    (idea) => idea.created_by === currentUser?.id,
  );

  // Filter ideas where user has voted (excluding their own ideas)
  const myVotes = allIdeas.filter(
    (idea) => idea.my_vote && idea.created_by !== currentUser?.id,
  );

  // Filter user's comments
  const myComments = allComments
    .filter((comment) => comment.user_id === currentUser?.id)
    .map((comment) => {
      // Find the idea this comment belongs to
      const idea = allIdeas.find((i) => i.idea_id === comment.idea_id);
      return {
        ...comment,
        ideaTitle: idea?.title || "Unknown Idea",
        ideaId: comment.idea_id,
      };
    });

  if (isLoading || isLoadingComments) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Content</CardTitle>
        <CardDescription>
          View all your ideas, comments, and votes in this workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ideas" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Ideas ({myIdeas.length})
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments ({myComments.length})
            </TabsTrigger>
            <TabsTrigger value="votes" className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              Votes ({myVotes.length})
            </TabsTrigger>
          </TabsList>

          {/* Ideas Tab */}
          <TabsContent value="ideas" className="mt-6">
            {myIdeas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>You haven't created any ideas yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myIdeas.map((idea) => (
                  <div
                    key={idea.idea_id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{idea.title}</h3>
                        {idea.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {idea.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {idea.vote_count} votes
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {idea.comment_count} comments
                          </span>
                          <span>{timeAgo(new Date(idea.created_at))}</span>
                        </div>
                      </div>
                      {idea.status_name && (
                        <Badge variant="secondary">{idea.status_name}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-6">
            {myComments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>You haven't commented on any ideas yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mb-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        On: {comment.ideaTitle}
                      </p>
                    </div>
                    <p className="text-sm mb-2">{comment.content}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {comment.reply_count > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {comment.reply_count}{" "}
                          {comment.reply_count === 1 ? "reply" : "replies"}
                        </span>
                      )}
                      <span>{timeAgo(new Date(comment.created_at))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Votes Tab */}
          <TabsContent value="votes" className="mt-6">
            {myVotes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ThumbsUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>You haven't voted on any ideas yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myVotes.map((idea) => (
                  <div
                    key={idea.idea_id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{idea.title}</h3>
                        {idea.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {idea.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {idea.vote_count} total votes
                          </span>
                          <span>{timeAgo(new Date(idea.created_at))}</span>
                        </div>
                      </div>
                      {idea.status_name && (
                        <Badge variant="secondary">{idea.status_name}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
