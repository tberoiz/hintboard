import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@hintboard/ui/component";
import {
  CommentsService,
  ActivitiesService,
  IdeaActivity,
  CommentWithUserInfo,
} from "@hintboard/supabase/services";
import { CommentItem, ReplyInput } from "./idea-comments";
import { useOrganization } from "@/shared/contexts/organizations-context";
import { formatRelativeTime } from "@/shared/utils/format-relative-time";

// ============ TYPES ============
type TimelineItem =
  | { type: "comment"; data: CommentWithUserInfo }
  | { type: "activity"; data: IdeaActivity };

interface FilePreview {
  file: File;
  preview: string | null;
  isImage: boolean;
}

// ============ ACTIVITY COMPONENT ============
const ActivityItem = ({ activity }: { activity: IdeaActivity }) => {
  const message = ActivitiesService.formatActivityMessage(activity);

  return (
    <div className="flex gap-3 items-start">
      <Avatar className="w-7 h-7 flex-shrink-0 opacity-60">
        <AvatarImage src={activity.user_avatar || undefined} />
        <AvatarFallback className="text-xs">
          {activity.user_name?.[0] || activity.user_email?.[0] || "?"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 pt-0.5">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {activity.user_name || activity.user_email}
          </span>{" "}
          {message}
        </p>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(activity.created_at)}
        </span>
      </div>
    </div>
  );
};

// ============ MAIN TIMELINE COMPONENT ============
interface IdeaActivityTimelineProps {
  ideaId: string;
  organizationSlug?: string;
  isOpen: boolean;
  onReplySubmit: (params: {
    ideaId: string;
    content: string;
    files?: File[];
    parentId?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export const IdeaActivityTimeline: React.FC<IdeaActivityTimelineProps> = ({
  ideaId,
  organizationSlug,
  isOpen,
  onReplySubmit,
  isSubmitting = false,
}) => {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  const [replyingTo, setReplyingTo] = React.useState<{
    commentId: string;
    userName: string;
  } | null>(null);
  const [replyText, setReplyText] = React.useState("");
  const [replyFiles, setReplyFiles] = React.useState<FilePreview[]>([]);

  // Fetch comments and activities
  const { data: comments = [] } = useQuery({
    queryKey: ["idea-comments", ideaId],
    queryFn: () => CommentsService.getIdeaComments(ideaId, "client"),
    enabled: isOpen,
    refetchInterval: isOpen ? 2000 : false,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["idea-activities", ideaId],
    queryFn: () => ActivitiesService.getIdeaActivities(ideaId, "client"),
    enabled: isOpen,
    refetchInterval: isOpen ? 2000 : false,
  });

  // Organize comments with replies
  const organizedComments = React.useMemo(() => {
    const topLevel: CommentWithUserInfo[] = [];
    const repliesMap = new Map<string, CommentWithUserInfo[]>();

    comments.forEach((comment) => {
      if (!comment.parent_id) {
        topLevel.push(comment);
      } else {
        if (!repliesMap.has(comment.parent_id)) {
          repliesMap.set(comment.parent_id, []);
        }
        repliesMap.get(comment.parent_id)!.push(comment);
      }
    });

    return { topLevel, repliesMap };
  }, [comments]);

  // Merge timeline
  const timeline: TimelineItem[] = React.useMemo(() => {
    const isGuest = organization?.role === "guest";

    const items: TimelineItem[] = [
      ...organizedComments.topLevel.map((c) => ({
        type: "comment" as const,
        data: c,
      })),
      // Only include activities if user is not a guest
      ...(isGuest
        ? []
        : activities.map((a) => ({ type: "activity" as const, data: a }))),
    ];

    return items.sort((a, b) => {
      const dateA = new Date(
        a.type === "comment" ? a.data.created_at : a.data.created_at,
      );
      const dateB = new Date(
        b.type === "comment" ? b.data.created_at : b.data.created_at,
      );
      return dateB.getTime() - dateA.getTime();
    });
  }, [organizedComments.topLevel, activities, organization?.role]);

  // Toggle reaction mutation
  const toggleReactionMutation = useMutation({
    mutationFn: ({ commentId, emoji }: { commentId: string; emoji: string }) =>
      CommentsService.toggleReaction(commentId, emoji, "client"),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["idea-comments", ideaId],
        });
      }, 100);
    },
  });

  const handleReplyFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024;

    if (files.some((f) => f.size > maxSize)) {
      return;
    }

    if (replyFiles.length + files.length > 5) {
      return;
    }

    const newFilePreviews: FilePreview[] = files.map((file) => ({
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
      isImage: file.type.startsWith("image/"),
    }));

    setReplyFiles((prev) => [...prev, ...newFilePreviews]);
    e.target.value = "";
  };

  const removeReplyFile = (index: number) => {
    setReplyFiles((prev) => {
      const fileToRemove = prev[index];
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ commentId, userName });
    setReplyText("");
    setReplyFiles([]);
  };

  const handleSubmitReply = async () => {
    if (!replyingTo) return;
    if (!replyText.trim() && replyFiles.length === 0) {
      return;
    }

    await onReplySubmit({
      ideaId,
      content: replyText.trim() || "(attachment)",
      files:
        replyFiles.length > 0 ? replyFiles.map((fp) => fp.file) : undefined,
      parentId: replyingTo.commentId,
    });

    setReplyingTo(null);
    setReplyText("");
    setReplyFiles([]);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText("");
    setReplyFiles([]);
  };

  React.useEffect(() => {
    return () => {
      replyFiles.forEach((fp) => {
        if (fp.preview) URL.revokeObjectURL(fp.preview);
      });
    };
  }, [replyFiles]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">
          Activity & Comments ({timeline.length})
        </h3>
      </div>

      {timeline.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            No activity yet. Be the first to comment!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {timeline.map((item, index) =>
            item.type === "comment" ? (
              <div key={index}>
                <CommentItem
                  comment={item.data}
                  organizationSlug={organizationSlug}
                  onToggleReaction={(commentId, emoji) =>
                    toggleReactionMutation.mutate({ commentId, emoji })
                  }
                  onReply={handleReply}
                  replies={organizedComments.repliesMap.get(item.data.id) || []}
                />
                {replyingTo?.commentId === item.data.id && replyingTo && (
                  <ReplyInput
                    value={replyText}
                    onChange={setReplyText}
                    onSubmit={handleSubmitReply}
                    onCancel={handleCancelReply}
                    attachedFiles={replyFiles}
                    onFileSelect={handleReplyFileSelect}
                    onFileRemove={removeReplyFile}
                    isSubmitting={isSubmitting}
                    replyingTo={replyingTo.userName}
                  />
                )}
              </div>
            ) : (
              <ActivityItem key={index} activity={item.data} />
            ),
          )}
        </div>
      )}
    </div>
  );
};
