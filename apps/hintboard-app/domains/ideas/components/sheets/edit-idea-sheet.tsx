"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@hintboard/ui/component";
import {
  IdeasService,
  IdeaWithUserInfo,
  AttachmentsService,
  CommentsService,
  TopicsService,
} from "@hintboard/supabase/services";
import { useOrganization } from "@/shared/contexts/organizations-context";
import { IdeaHeader } from "./idea-header";
import { IdeaForm, IdeaFormData, FilePreview } from "../forms/idea-form";
import { CommentInput } from "../idea-comments";
import { IdeaActivityTimeline } from "../idea-activity-timeline";

// ============ MAIN SHEET COMPONENT ============
interface EditIdeaSheetProps {
  idea: IdeaWithUserInfo;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditIdeaSheet: React.FC<EditIdeaSheetProps> = ({
  idea,
  isOpen,
  onOpenChange,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  const [newComment, setNewComment] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<FilePreview[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form data for edit mode
  const [editFormData, setEditFormData] = useState<IdeaFormData>({
    title: idea.title,
    description: idea.description || "",
    isPrivate: idea.is_private || false,
    selectedTopics: idea.topics?.map((t: any) => t.id) || [],
    selectedUserId: null,
    attachedFiles: [],
  });

  const isGuest =
    organization?.role === "guest" || organization.role === "viewer";
  const canEdit = !isGuest;

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (data: {
      ideaId: string;
      content: string;
      files?: File[];
      parentId?: string;
    }) => {
      const comment = await CommentsService.createComment(
        {
          ideaId: data.ideaId,
          content: data.content,
          parentId: data.parentId,
        },
        "client",
      );

      if (
        data.files &&
        data.files.length > 0 &&
        organization?.slug &&
        organization?.id
      ) {
        await Promise.all(
          data.files.map((file) =>
            AttachmentsService.uploadAttachment(
              organization.slug,
              organization.id,
              file,
              { commentId: comment.id },
              "client",
            ),
          ),
        );
      }
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["idea-comments", idea.idea_id],
      });
      setNewComment("");
      setAttachedFiles([]);
      toast.success("Comment added!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add comment.");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024;

    if (files.some((f) => f.size > maxSize)) {
      toast.error("Some files exceed the 10MB size limit");
      return;
    }

    if (attachedFiles.length + files.length > 5) {
      toast.error("You can only attach up to 5 files");
      return;
    }

    const newFilePreviews: FilePreview[] = files.map((file) => ({
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
      isImage: file.type.startsWith("image/"),
    }));

    setAttachedFiles((prev) => [...prev, ...newFilePreviews]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => {
      const fileToRemove = prev[index];
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && attachedFiles.length === 0) {
      toast.error("Please add a comment or attach a file");
      return;
    }

    addCommentMutation.mutate({
      ideaId: idea.idea_id,
      content: newComment.trim() || "(attachment)",
      files:
        attachedFiles.length > 0
          ? attachedFiles.map((fp) => fp.file)
          : undefined,
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await IdeasService.deleteIdea(idea.idea_id, "client");
      queryClient.invalidateQueries({ queryKey: ["filtered-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["idea", idea.idea_id] });
      toast.success("Idea deleted successfully!");
      setShowDeleteDialog(false);
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete idea.");
    } finally {
      setDeleting(false);
    }
  };

  const copyIdeaLink = async () => {
    try {
      if (typeof window === "undefined" || !navigator?.clipboard) {
        throw new Error("Clipboard API not available in this environment.");
      }

      const ideaUrl = `${window.location.origin}/ideas/${idea.idea_id}`;
      await navigator.clipboard.writeText(ideaUrl);

      toast.success("Link copied to clipboard!");
    } catch (error: any) {
      console.error("Failed to copy idea link:", error);
      toast.error("Failed to copy link. Please try manually.");
    }
  };

  const handleEdit = () => {
    setEditFormData({
      title: idea.title,
      description: idea.description || "",
      isPrivate: idea.is_private || false,
      selectedTopics: idea.topics?.map((t: any) => t.id) || [],
      selectedUserId: null,
      attachedFiles: [],
    });
    setIsEditMode(true);
  };

  // Replace the handleSaveEdit function in your EditIdeaSheet component

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editFormData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      // 1. Update the idea basic fields
      await IdeasService.updateIdea(
        idea.idea_id,
        {
          title: editFormData.title.trim(),
          description: editFormData.description.trim() || undefined,
          is_private: editFormData.isPrivate,
        },
        "client",
      );

      // 2. Update topics if they changed
      const currentTopicIds = idea.topics?.map((t: any) => t.id) || [];
      const newTopicIds = editFormData.selectedTopics;

      // Check if topics changed
      const topicsChanged =
        currentTopicIds.length !== newTopicIds.length ||
        !currentTopicIds.every((id: any) => newTopicIds.includes(id));

      if (topicsChanged) {
        // Remove topics that are no longer selected
        const topicsToRemove = currentTopicIds.filter(
          (id: any) => !newTopicIds.includes(id),
        );
        for (const topicId of topicsToRemove) {
          await TopicsService.removeTopicFromIdea(
            idea.idea_id,
            topicId,
            "client",
          );
        }

        // Add new topics
        const topicsToAdd = newTopicIds.filter(
          (id) => !currentTopicIds.includes(id),
        );
        for (const topicId of topicsToAdd) {
          await TopicsService.assignTopicToIdea(
            idea.idea_id,
            topicId,
            "client",
          );
        }
      }

      toast.success("Idea updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["filtered-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["idea", idea.idea_id] });
      setIsEditMode(false);
      router.refresh();
    } catch (error: any) {
      console.error("Error updating idea:", error);
      toast.error(error.message || "Failed to update idea.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditFormData({
      title: idea.title,
      description: idea.description || "",
      isPrivate: idea.is_private || false,
      selectedTopics: idea.topics?.map((t: any) => t.id) || [],
      selectedUserId: null,
      attachedFiles: [],
    });
    setIsEditMode(false);
  };

  const handleEditFormDataChange = (data: Partial<IdeaFormData>) => {
    setEditFormData((prev) => ({ ...prev, ...data }));
  };

  const handleReplySubmit = async (params: {
    ideaId: string;
    content: string;
    files?: File[];
    parentId?: string;
  }) => {
    await addCommentMutation.mutateAsync(params);
  };

  useEffect(() => {
    return () => {
      attachedFiles.forEach((fp) => {
        if (fp.preview) URL.revokeObjectURL(fp.preview);
      });
    };
  }, [attachedFiles]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-8 sm:max-w-2xl w-full overflow-hidden">
        <VisuallyHidden>
          <SheetHeader>
            <SheetTitle>Idea Details</SheetTitle>
          </SheetHeader>
        </VisuallyHidden>
        <div className="flex-1 overflow-y-auto">
          {/* Header - includes description when not in edit mode */}
          {!isEditMode && (
            <div className="px-6 pt-6 pb-4 border-b border-border/30">
              <IdeaHeader
                idea={idea}
                onEdit={handleEdit}
                onDelete={() => setShowDeleteDialog(true)}
                onCopyLink={copyIdeaLink}
                canEdit={canEdit}
                organizationSlug={organization?.slug}
              />
            </div>
          )}

          {/* Edit Mode */}
          {isEditMode && canEdit && (
            <div className="px-6 py-6 border-b border-border/30">
              <IdeaForm
                organizationId={organization?.id || ""}
                organizationSlug={organization?.slug || ""}
                userRole={organization?.role || "guest"}
                isEditMode={true}
                existingIdea={idea}
                loading={saving}
                formData={editFormData}
                onFormDataChange={handleEditFormDataChange}
                onSubmit={handleSaveEdit}
                submitButtonText="Save Changes"
                onCancel={handleCancelEdit}
              />
            </div>
          )}

          {/* Comment Input */}
          <div className="px-6 py-4 border-b border-border/30">
            <CommentInput
              value={newComment}
              onChange={setNewComment}
              onSubmit={handleAddComment}
              attachedFiles={attachedFiles}
              onFileSelect={handleFileSelect}
              onFileRemove={removeFile}
              isSubmitting={addCommentMutation.isPending}
            />
          </div>

          {/* Activity Timeline */}
          <div className="px-6 py-4">
            <IdeaActivityTimeline
              ideaId={idea.idea_id}
              organizationSlug={organization?.slug}
              isOpen={isOpen}
              onReplySubmit={handleReplySubmit}
              isSubmitting={addCommentMutation.isPending}
            />
          </div>
        </div>
      </SheetContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this idea?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              idea and all associated votes and comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete idea"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
};
