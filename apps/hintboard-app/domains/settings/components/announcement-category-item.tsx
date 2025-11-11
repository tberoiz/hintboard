import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "@hintboard/ui/component";
import { Trash2, GripVertical, Edit2, Check, X, Tag } from "lucide-react";
import { AnnouncementsService } from "@hintboard/supabase/services";

interface AnnouncementCategoryItemProps {
  category: {
    id: string;
    name: string;
    color: string;
    sort_order: number;
    announcement_count?: number;
  };
  organizationId: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function AnnouncementCategoryItem({
  category,
  organizationId,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: AnnouncementCategoryItemProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editColor, setEditColor] = useState(category.color);

  const deleteMutation = useMutation({
    mutationFn: () =>
      AnnouncementsService.deleteCategory(category.id, "client"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["announcement-categories", organizationId],
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updates: { name?: string; color?: string }) =>
      AnnouncementsService.updateCategory(category.id, updates, "client"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["announcement-categories", organizationId],
      });
      setIsEditing(false);
    },
  });

  const handleSave = () => {
    const updates: { name?: string; color?: string } = {};
    if (editName.trim() !== category.name) {
      updates.name = editName.trim();
    }
    if (editColor !== category.color) {
      updates.color = editColor;
    }

    if (Object.keys(updates).length > 0) {
      updateMutation.mutate(updates);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName(category.name);
    setEditColor(category.color);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="flex items-center gap-2 w-full bg-accent/50 px-4 py-3 rounded-md border border-border hover:border-accent-foreground/20 transition-colors group">
      {/* Reorder buttons */}
      <div className="flex flex-col gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveUp}
          disabled={isFirst}
          className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <GripVertical className="h-3 w-3 rotate-90" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveDown}
          disabled={isLast}
          className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <GripVertical className="h-3 w-3 -rotate-90" />
        </Button>
      </div>

      {/* Category color */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          className="w-4 h-4 rounded-full border border-border"
          style={{ backgroundColor: category.color }}
        />
      </div>

      {/* Category name (editable) */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleSave}
              autoFocus
              className="h-8 text-sm flex-1"
              disabled={updateMutation.isPending}
            />
            <input
              type="color"
              value={editColor}
              onChange={(e) => setEditColor(e.target.value)}
              className="h-8 w-16 rounded border border-border cursor-pointer"
              disabled={updateMutation.isPending}
            />
          </div>
        ) : (
          <span className="text-sm font-medium truncate">{category.name}</span>
        )}
      </div>

      {/* Announcement count */}
      {category.announcement_count !== undefined && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {category.announcement_count}
        </span>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
