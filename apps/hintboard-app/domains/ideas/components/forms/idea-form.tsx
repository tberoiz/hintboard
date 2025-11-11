"use client";

import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Info, Paperclip, ChevronDown, X } from "lucide-react";
import {
  Button,
  Label,
  Switch,
  Badge,
  Avatar,
  AvatarFallback,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
  Card,
  CardHeader,
  CardContent,
  AspectRatio,
} from "@hintboard/ui/component";
import {
  TopicsService,
  OrganizationService,
  IdeaWithUserInfo,
} from "@hintboard/supabase/services";

// ============ TYPES ============
export interface FilePreview {
  file: File;
  preview: string | null;
  isImage: boolean;
}

export interface IdeaFormData {
  title: string;
  description: string;
  isPrivate: boolean;
  selectedTopics: string[];
  selectedUserId: string | null;
  attachedFiles: FilePreview[];
}

interface IdeaFormProps {
  organizationId: string;
  organizationSlug: string;
  userRole: string;
  isEditMode?: boolean;
  existingIdea?: IdeaWithUserInfo;
  loading: boolean;
  formData: IdeaFormData;
  onFormDataChange: (data: Partial<IdeaFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitButtonText?: string;
  onCancel?: () => void;
}

// ============ HELPER FUNCTIONS ============
const isImageFile = (file: File): boolean => file.type.startsWith("image/");

// ============ USER SELECTOR COMPONENT ============
const UserSelector = ({
  workspaceUsers,
  selectedUserId,
  onSelectUser,
  loading,
}: {
  workspaceUsers: any[];
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  loading: boolean;
}) => {
  const [showUserList, setShowUserList] = useState(false);
  const selectedUser = workspaceUsers.find((u: any) => u.id === selectedUserId);

  return (
    <div className="relative">
      <InputGroup>
        <InputGroupAddon>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-sm font-medium">
              {selectedUser?.name?.[0]?.toUpperCase() ??
                selectedUser?.email?.[0]?.toUpperCase() ??
                "?"}
            </AvatarFallback>
          </Avatar>
        </InputGroupAddon>
        <InputGroupInput
          value={selectedUser?.name ?? selectedUser?.email ?? ""}
          readOnly
          className="font-medium"
          disabled={loading}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            variant="ghost"
            size="sm"
            type="button"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
            onClick={() => setShowUserList((prev) => !prev)}
          >
            Change
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showUserList ? "rotate-180" : ""
              }`}
            />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      {showUserList && (
        <Card className="absolute z-10 mt-2 w-full border shadow-lg bg-background">
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Select a user
            </p>
          </CardHeader>
          <CardContent className="max-h-48 overflow-y-auto space-y-1">
            {workspaceUsers.map((user: any, index: number) => (
              <div
                key={user.id ?? index}
                onClick={() => {
                  onSelectUser(user.id);
                  setShowUserList(false);
                }}
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition ${
                  selectedUserId === user.id
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "hover:bg-accent"
                }`}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {user.name?.[0]?.toUpperCase() ??
                      user.email?.[0]?.toUpperCase() ??
                      "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm">{user.name || user.email}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {user.role}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============ MAIN FORM COMPONENT ============
export const IdeaForm: React.FC<IdeaFormProps> = ({
  organizationId,
  organizationSlug,
  userRole,
  isEditMode = false,
  existingIdea,
  loading,
  formData,
  onFormDataChange,
  onSubmit,
  submitButtonText = "Submit Idea",
  onCancel,
}) => {
  const isGuest = userRole === "guest";
  const isAdmin = userRole === "admin";

  // Fetch topics
  const { data: topics = [] } = useQuery({
    queryKey: ["topics", organizationId],
    queryFn: () => TopicsService.getTopics(organizationId, "client"),
    enabled: !!organizationId,
  });

  // Fetch workspace users (only if admin)
  const { data: workspaceUsersRaw = [] } = useQuery({
    queryKey: ["workspace-users", organizationId],
    queryFn: () =>
      OrganizationService.getWorkspaceUsers(organizationId, "client"),
    enabled: !!organizationId && isAdmin,
  });

  const workspaceUsers = React.useMemo(
    () =>
      workspaceUsersRaw.map((u: any) => ({
        ...u,
        id: u.id ?? u.user_id,
      })),
    [workspaceUsersRaw],
  );

  // Auto-select first user for admins
  React.useEffect(() => {
    if (isAdmin && !formData.selectedUserId && workspaceUsers.length > 0) {
      onFormDataChange({ selectedUserId: workspaceUsers[0].id });
    }
  }, [workspaceUsers, formData.selectedUserId, isAdmin, onFormDataChange]);

  // Cleanup preview URLs on unmount
  React.useEffect(() => {
    return () => {
      formData.attachedFiles.forEach((filePreview) => {
        if (filePreview.preview) {
          URL.revokeObjectURL(filePreview.preview);
        }
      });
    };
  }, [formData.attachedFiles]);

  const toggleTopic = (topicId: string) => {
    const newTopics = formData.selectedTopics.includes(topicId)
      ? formData.selectedTopics.filter((id) => id !== topicId)
      : formData.selectedTopics.length >= 3
        ? formData.selectedTopics
        : [...formData.selectedTopics, topicId];

    if (
      !formData.selectedTopics.includes(topicId) &&
      formData.selectedTopics.length >= 3
    ) {
      toast.error("You can select up to 3 topics");
      return;
    }

    onFormDataChange({ selectedTopics: newTopics });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (files.some((f) => f.size > maxSize)) {
      toast.error("Some files exceed the 10MB size limit");
      return;
    }

    if (formData.attachedFiles.length + files.length > 5) {
      toast.error("You can only attach up to 5 files");
      return;
    }

    const newFilePreviews: FilePreview[] = files.map((file) => ({
      file,
      preview: isImageFile(file) ? URL.createObjectURL(file) : null,
      isImage: isImageFile(file),
    }));

    onFormDataChange({
      attachedFiles: [...formData.attachedFiles, ...newFilePreviews],
    });
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    const fileToRemove = formData.attachedFiles[index];
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    onFormDataChange({
      attachedFiles: formData.attachedFiles.filter((_, i) => i !== index),
    });
  };

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      {/* User Selector - Only for admins */}
      {isAdmin && (
        <UserSelector
          workspaceUsers={workspaceUsers}
          selectedUserId={formData.selectedUserId}
          onSelectUser={(userId) =>
            onFormDataChange({ selectedUserId: userId })
          }
          loading={loading}
        />
      )}

      {/* Title */}
      <div>
        <InputGroup>
          <InputGroupInput
            id="title"
            value={formData.title}
            onChange={(e) => onFormDataChange({ title: e.target.value })}
            placeholder="One sentence that summarizes your Idea"
            required
            disabled={loading}
            className="h-11"
          />
        </InputGroup>
      </div>

      {/* Description with File Attachment */}
      <div className="space-y-2">
        <InputGroup>
          <InputGroupTextarea
            id="description"
            value={formData.description}
            onChange={(e) => onFormDataChange({ description: e.target.value })}
            placeholder="Why your Idea is useful, who would benefit and how it should work?"
            rows={10}
            disabled={loading}
            className="resize-none min-h-[200px]"
          />
          <InputGroupAddon align="block-end">
            <label htmlFor="file-upload">
              <InputGroupButton
                type="button"
                variant="ghost"
                size="icon-xs"
                className="rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </InputGroupButton>
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
              disabled={loading}
            />
          </InputGroupAddon>
        </InputGroup>

        {/* Small Thumbnail Preview Below Textarea */}
        {formData.attachedFiles.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {formData.attachedFiles.map((filePreview, index) => (
              <div
                key={index}
                className="relative group w-16 h-16 rounded-md overflow-hidden border border-border bg-muted"
              >
                {filePreview.isImage && filePreview.preview ? (
                  <>
                    <img
                      src={filePreview.preview}
                      alt={filePreview.file.name}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeFile(index)}
                      disabled={loading}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center w-full h-full">
                      <Paperclip className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeFile(index)}
                      disabled={loading}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Topics */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-normal text-muted-foreground flex items-center gap-1.5">
            Choose up to 3 Topics for this Idea (optional)
            <Info className="h-3.5 w-3.5" />
          </Label>
        </div>

        {topics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Badge
                key={topic.id}
                variant={
                  formData.selectedTopics.includes(topic.id)
                    ? "default"
                    : "outline"
                }
                className={`cursor-pointer transition-all px-3 py-1.5 text-sm font-medium ${
                  formData.selectedTopics.includes(topic.id)
                    ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
                    : "bg-background hover:bg-accent hover:border-accent-foreground/20"
                }`}
                onClick={() => !loading && toggleTopic(topic.id)}
              >
                {topic.name} {topic.emoji || ""}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic py-2">
            No topics available. Add topics in Settings.
          </p>
        )}
      </div>

      {/* Private Toggle - Hidden for guest users */}
      {!isGuest && (
        <div className="flex items-center justify-between py-4 border-t">
          <Label
            htmlFor="isPrivate"
            className="text-sm font-medium cursor-pointer"
          >
            Private
          </Label>
          <Switch
            id="isPrivate"
            checked={formData.isPrivate}
            onCheckedChange={(checked) =>
              onFormDataChange({ isPrivate: checked })
            }
            disabled={loading}
          />
        </div>
      )}

      {/* Submit Buttons */}
      <div className="pt-2 flex gap-2">
        <Button
          type="submit"
          disabled={loading || !formData.title.trim()}
          className="flex-1 h-11 text-base font-medium"
        >
          {loading
            ? isEditMode
              ? "Saving..."
              : "Creating..."
            : submitButtonText}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-11 text-base font-medium"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};
