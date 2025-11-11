"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Button,
  Textarea,
  Avatar,
  AvatarImage,
  AvatarFallback,
  AspectRatio,
  HStack,
  VStack,
  Alert,
  AlertDescription,
} from "@hintboard/ui/component";
import {
  AttachmentsService,
  CommentWithUserInfo,
  AttachmentMetadata,
  UserService,
} from "@hintboard/supabase/services";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, X, Download, Smile, Reply } from "lucide-react";
import { FilePreview } from "./forms/idea-form";
import { formatRelativeTime } from "@/shared/utils/format-relative-time";

// ============ UTILITY FUNCTIONS ============

const groupReactions = (reactions: { emoji: string; user_id: string }[]) => {
  const grouped: Record<string, { count: number; userIds: string[] }> = {};
  reactions.forEach((r) => {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { count: 0, userIds: [] };
    }
    grouped[r.emoji]!.count++;
    grouped[r.emoji]!.userIds.push(r.user_id);
  });
  return grouped;
};

// ============ CUSTOM HOOK FOR AUTH ============
const useAuth = () => {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await UserService.getCurrentUser("client");
        // Consider both real users AND anonymous users as "authenticated" for UI purposes
        // This hides the "login" alert after anonymous user is created
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();

    // Listen for user query invalidations to refetch auth status
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        event.query.queryKey[0] === "currentUser"
      ) {
        checkAuth();
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  return { isAuthenticated, isLoading };
};

// ============ ATTACHMENT COMPONENT ============
const AttachmentDisplay = ({
  attachment,
  organizationSlug,
}: {
  attachment: AttachmentMetadata;
  organizationSlug?: string;
}) => {
  const isImage = attachment.file_type.startsWith("image/");
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  React.useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        if (!organizationSlug) return;
        const url = await AttachmentsService.getAttachmentUrl(
          organizationSlug,
          attachment.file_path,
          "client",
        );
        if (isActive) setPublicUrl(url);
      } catch (err) {
        console.error("Failed to resolve attachment URL", err);
      }
    })();
    return () => {
      isActive = false;
    };
  }, [organizationSlug, attachment.file_path]);

  if (isImage) {
    return (
      <a
        href={publicUrl || undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
      >
        <div className="w-48 rounded-xl overflow-hidden border border-border/50 hover:border-border transition-colors cursor-zoom-in">
          <AspectRatio ratio={16 / 9}>
            <img
              src={publicUrl || ""}
              alt={attachment.file_name}
              className="w-full h-full object-cover"
            />
          </AspectRatio>
        </div>
      </a>
    );
  }

  return (
    <HStack
      gap={3}
      align="center"
      className="p-3 bg-muted/50 rounded-lg border border-border/50 max-w-xs hover:bg-muted transition-colors"
    >
      <div className="p-2 bg-background rounded-lg">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="text-sm truncate flex-1 font-medium">
        {attachment.file_name}
      </span>
      {publicUrl && (
        <a href={publicUrl} download={attachment.file_name}>
          <Button variant="ghost" size="icon-sm" className="flex-shrink-0">
            <Download className="w-4 h-4" />
          </Button>
        </a>
      )}
    </HStack>
  );
};

// ============ FILE PREVIEW COMPONENT ============
const FilePreviewItem = ({
  filePreview,
  onRemove,
}: {
  filePreview: FilePreview;
  onRemove: () => void;
}) => (
  <div className="relative group">
    {filePreview.isImage && filePreview.preview ? (
      <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border/50">
        <img
          src={filePreview.preview}
          alt={filePreview.file.name}
          className="w-full h-full object-cover"
        />
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 p-1 bg-background/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    ) : (
      <HStack
        gap={2}
        align="center"
        className="p-3 bg-muted/50 rounded-lg border border-border/50 max-w-xs"
      >
        <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm flex-1 truncate">{filePreview.file.name}</span>
        <Button variant="ghost" size="icon-sm" onClick={onRemove}>
          <X className="w-4 h-4" />
        </Button>
      </HStack>
    )}
  </div>
);

// ============ REPLY INPUT COMPONENT ============
interface ReplyInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  attachedFiles: FilePreview[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: (index: number) => void;
  isSubmitting: boolean;
  replyingTo: string;
}

export const ReplyInput: React.FC<ReplyInputProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  attachedFiles,
  onFileSelect,
  onFileRemove,
  isSubmitting,
  replyingTo,
}) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    try {
      // Ensure user has auth (creates anonymous if needed)
      const user = await UserService.requireAuth();

      // If a new anonymous user was just created, invalidate the user query
      if (user.justCreated) {
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      }

      await onSubmit();
    } catch (error) {
      console.error("Error submitting reply:", error);
    }
  };

  return (
    <VStack
      gap={3}
      className="ml-12 mt-2 bg-muted/20 rounded-2xl p-4 border border-border/30"
    >
      <HStack gap={2} align="center" className="text-xs text-muted-foreground">
        <Reply className="w-3 h-3" />
        <span>Replying to {replyingTo}</span>
        <button onClick={onCancel} className="ml-auto hover:text-foreground">
          Cancel
        </button>
      </HStack>

      {attachedFiles.length > 0 && (
        <HStack gap={2} wrap="wrap">
          {attachedFiles.map((fp, index) => (
            <FilePreviewItem
              key={index}
              filePreview={fp}
              onRemove={() => onFileRemove(index)}
            />
          ))}
        </HStack>
      )}

      <HStack gap={2}>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            isAuthenticated
              ? "Write a reply..."
              : "Write a reply (you'll reply anonymously)..."
          }
          className="resize-none flex-1 min-h-[60px] border-border/50 bg-background rounded-xl text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          autoFocus
        />
        <VStack gap={2}>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              document.getElementById("reply-file-upload")?.click()
            }
            className="rounded-xl"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <input
            id="reply-file-upload"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={onFileSelect}
            className="hidden"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={
              (!value.trim() && attachedFiles.length === 0) || isSubmitting
            }
            className="rounded-xl"
          >
            <Send className="w-4 h-4" />
          </Button>
        </VStack>
      </HStack>

      {!isAuthenticated && (
        <Alert variant="default">
          <AlertDescription className="flex items-center justify-between text-sm">
            <span>You're not logged in. You'll reply anonymously.</span>
            <a href="/login">Login</a>
          </AlertDescription>
        </Alert>
      )}
    </VStack>
  );
};

// ============ COMMENT COMPONENT ============
interface CommentItemProps {
  comment: CommentWithUserInfo;
  organizationSlug?: string;
  onToggleReaction: (commentId: string, emoji: string) => void;
  onReply: (commentId: string, userName: string) => void;
  replies?: CommentWithUserInfo[];
  depth?: number;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  organizationSlug,
  onToggleReaction,
  onReply,
  replies = [],
  depth = 0,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const quickEmojis = ["👍", "❤️", "😊", "🎉", "🚀", "👀"];
  const reactions = groupReactions(
    Array.isArray(comment.reactions) ? comment.reactions : [],
  );

  return (
    <VStack gap={4}>
      <HStack gap={3} align="start">
        <Avatar className="w-9 h-9 ring-2 ring-background shadow-sm flex-shrink-0">
          <AvatarImage src={comment.user_avatar || undefined} />
          <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-primary/20 to-primary/10">
            {comment.user_name?.[0] || comment.user_email?.[0] || "?"}
          </AvatarFallback>
        </Avatar>

        <VStack gap={1} className="flex-1 min-w-0">
          <HStack gap={2} align="center">
            <span className="font-semibold text-sm">
              {comment.user_name || comment.user_email}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.created_at)}
            </span>
          </HStack>

          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {comment.content}
          </p>

          {comment.attachments &&
            Array.isArray(comment.attachments) &&
            comment.attachments.length > 0 && (
              <VStack gap={2} className="mt-2">
                {comment.attachments.map((attachment: any) => (
                  <AttachmentDisplay
                    key={attachment.id}
                    attachment={attachment}
                    organizationSlug={organizationSlug}
                  />
                ))}
              </VStack>
            )}

          <HStack gap={3} align="center" className="mt-1">
            {Object.keys(reactions).length > 0 && (
              <HStack gap={1}>
                {Object.entries(reactions).map(([emoji, { count }]) => (
                  <button
                    key={emoji}
                    onClick={() => onToggleReaction(comment.id, emoji)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-muted/50 hover:bg-muted rounded-full text-xs font-medium transition-colors border border-border/30"
                  >
                    <span>{emoji}</span>
                    <span>{count}</span>
                  </button>
                ))}
              </HStack>
            )}

            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Smile className="w-3.5 h-3.5" />
                <span>React</span>
              </button>

              {showEmojiPicker && (
                <HStack
                  gap={1}
                  className="absolute left-0 top-full mt-1 bg-background border border-border/50 rounded-xl shadow-lg p-2 z-50"
                >
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onToggleReaction(comment.id, emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-lg text-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </HStack>
              )}
            </div>

            {/* Only show Reply button for top-level comments (depth === 0) */}
            {depth === 0 && (
              <button
                onClick={() =>
                  onReply(comment.id, comment.user_name || comment.user_email)
                }
                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            )}
          </HStack>
        </VStack>
      </HStack>

      {/* Nested Replies */}
      {replies.length > 0 && (
        <VStack gap={4} className="ml-12 border-l-2 border-border/30 pl-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              organizationSlug={organizationSlug}
              onToggleReaction={onToggleReaction}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </VStack>
      )}
    </VStack>
  );
};

// ============ COMMENT INPUT COMPONENT ============
interface CommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  attachedFiles: FilePreview[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: (index: number) => void;
  isSubmitting: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  value,
  onChange,
  onSubmit,
  attachedFiles,
  onFileSelect,
  onFileRemove,
  isSubmitting,
}) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    try {
      // Ensure user has auth (creates anonymous if needed)
      const user = await UserService.requireAuth();

      // If a new anonymous user was just created, invalidate the user query
      if (user.justCreated) {
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      }

      await onSubmit();
    } catch (error) {
      console.error("Error submitting comment:", error);
    }
  };

  return (
    <VStack
      gap={3}
      className="bg-muted/20 rounded-2xl p-4 border border-border/30"
    >
      {attachedFiles.length > 0 && (
        <HStack gap={2} wrap="wrap">
          {attachedFiles.map((fp, index) => (
            <FilePreviewItem
              key={index}
              filePreview={fp}
              onRemove={() => onFileRemove(index)}
            />
          ))}
        </HStack>
      )}

      <HStack gap={2}>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            isAuthenticated
              ? "Add a comment..."
              : "Add a comment (you'll comment anonymously)..."
          }
          className="resize-none flex-1 min-h-[80px] border-border/50 bg-background rounded-xl"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <VStack gap={2}>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              document.getElementById("comment-file-upload")?.click()
            }
            className="rounded-xl"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <input
            id="comment-file-upload"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={onFileSelect}
            className="hidden"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={
              (!value.trim() && attachedFiles.length === 0) || isSubmitting
            }
            className="rounded-xl"
          >
            <Send className="w-4 h-4" />
          </Button>
        </VStack>
      </HStack>

      {!isAuthenticated && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50">
          <AlertDescription className="flex items-center justify-between text-sm">
            <span className="text-blue-900 dark:text-blue-100">
              You`&apos;re not logged in. You`&apos;ll comment anonymously.
            </span>
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline-offset-4 hover:underline transition-colors"
            >
              Login
            </a>
          </AlertDescription>
        </Alert>
      )}
    </VStack>
  );
};
