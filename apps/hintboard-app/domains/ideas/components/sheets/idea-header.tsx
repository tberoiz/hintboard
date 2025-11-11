import { HStack, VStack } from "@hintboard/ui/component";
import { Badge, Button } from "@hintboard/ui/component";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hintboard/ui/component";
import {
  MoreHorizontal,
  Pencil,
  Link2,
  Trash2,
  Paperclip,
  Bug,
} from "lucide-react";

import { CreatorUserInline } from "@/shared/creator-user";
import { IdeaWithUserInfo, TopicRow } from "@hintboard/supabase/services";
import { useOrganization } from "@/shared/contexts/organizations-context";
import { IdeaActionsGroup } from "../idea-actions-group";

const MENU_ITEMS = [
  { icon: Pencil, label: "Edit idea", action: "onEdit" },
  { icon: Link2, label: "Copy link", action: "onCopyLink" },
] as const;

const ActionsMenu = ({
  idea,
  onEdit,
  onDelete,
  onCopyLink,
}: {
  idea: IdeaWithUserInfo;
  onEdit: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
}) => {
  const { organization } = useOrganization();

  return (
    <VStack gap={2} justify="center" align="center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="flex-shrink-0 ring-0 !focus-visible:ring-0"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {MENU_ITEMS.map(({ icon: Icon, label, action }) => (
            <DropdownMenuItem
              key={action}
              onClick={{ onEdit, onCopyLink }[action]}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete idea
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <VStack className="border-t p-4 bg-background">
        <IdeaActionsGroup idea={idea} organizationRole={organization?.role} />
      </VStack>
    </VStack>
  );
};

const isImageFile = (fileType: string | undefined | null): boolean => {
  if (!fileType) return false;
  return fileType.startsWith("image/");
};

const getAttachmentUrl = (
  filePath: string,
  organizationSlug: string,
): string => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const bucketName = `org-${organizationSlug}`;
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
};

export const IdeaHeader = ({
  idea,
  onEdit,
  onDelete,
  onCopyLink,
  canEdit,
  organizationSlug,
}: {
  idea: IdeaWithUserInfo;
  onEdit: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  canEdit: boolean;
  organizationSlug?: string;
}) => (
  <VStack gap={4} className="w-full">
    <HStack gap={3} align="start" className="w-full">
      <VStack gap={3} className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground">
          {idea.vote_count || 0} {idea.vote_count === 1 ? "vote" : "votes"}
        </span>
        <h2 className="text-xl font-semibold leading-tight text-foreground">
          {idea.title}
        </h2>

        {/* Description */}
        {idea.description && (
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {idea.description}
          </p>
        )}

        {/* Attachments */}
        {idea.attachments &&
          idea.attachments.length > 0 &&
          organizationSlug && (
            <div className="flex gap-2 flex-wrap">
              {idea.attachments.map((attachment: any, index: number) => {
                const attachmentUrl = getAttachmentUrl(
                  attachment.file_path,
                  organizationSlug,
                );
                return (
                  <a
                    key={attachment.id || index}
                    href={attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group w-16 h-16 rounded-md overflow-hidden border border-border bg-muted hover:border-foreground/20 transition-colors"
                    title={attachment.file_name}
                  >
                    {isImageFile(attachment.file_type) ? (
                      <img
                        src={attachmentUrl}
                        alt={attachment.file_name || "Attachment"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full p-1">
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                        <span className="text-[8px] text-muted-foreground mt-0.5 truncate w-full text-center">
                          {attachment.file_type?.split("/")[1]?.toUpperCase() ||
                            "FILE"}
                        </span>
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          )}

        {/* Topics and status */}
        <HStack gap={2} wrap="wrap" align="center">
          {idea.topics?.map((topic: TopicRow) => (
            <span key={topic.id} className="text-xs text-muted-foreground">
              #{topic.name}
            </span>
          ))}

          {idea.status_name && (
            <Badge
              variant="secondary"
              className="rounded-md px-2.5 py-0.5 text-xs font-medium border"
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

        {/* Creator info */}
        <HStack gap={2} align="center" wrap="wrap">
          <CreatorUserInline
            name={idea.creator_name}
            email={idea.creator_email}
            avatar={idea.creator_avatar}
            organization={idea.creator_organization}
            createdAt={idea.created_at}
          />
        </HStack>
      </VStack>

      {canEdit && (
        <ActionsMenu
          idea={idea}
          onEdit={onEdit}
          onDelete={onDelete}
          onCopyLink={onCopyLink}
        />
      )}
    </HStack>
  </VStack>
);
