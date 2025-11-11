import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Input,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@hintboard/ui/component";
import { StatusesService } from "@hintboard/supabase/services";
import {
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";

interface StatusItemProps {
  status: {
    id: string;
    name: string;
    color: string;
    sort_order: number;
  };
  organizationId: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function StatusItem({
  status,
  organizationId,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: StatusItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);
  const [editColor, setEditColor] = useState(status.color);
  const queryClient = useQueryClient();

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (updates: { name?: string; color?: string }) =>
      StatusesService.updateStatus(status.id, updates, "client"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statuses", organizationId] });
      setIsEditing(false);
    },
  });

  // Delete status mutation
  const deleteStatusMutation = useMutation({
    mutationFn: () => StatusesService.deleteStatus(status.id, "client"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statuses", organizationId] });
    },
  });

  const handleSave = () => {
    const updates: { name?: string; color?: string } = {};

    if (editName.trim() !== status.name) {
      updates.name = editName.trim();
    }

    if (editColor !== status.color) {
      updates.color = editColor;
    }

    if (Object.keys(updates).length > 0) {
      updateStatusMutation.mutate(updates);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName(status.name);
    setEditColor(status.color);
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
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
      {/* Drag Handle */}
      <div className="flex flex-col gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Color Indicator/Picker */}
      {isEditing ? (
        <input
          type="color"
          value={editColor}
          onChange={(e) => setEditColor(e.target.value)}
          className="h-8 w-12 rounded border border-border cursor-pointer flex-shrink-0"
          disabled={updateStatusMutation.isPending}
        />
      ) : (
        <div
          className="h-8 w-3 rounded flex-shrink-0"
          style={{ backgroundColor: status.color }}
          title={status.color}
        />
      )}

      {/* Name Input/Display */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={updateStatusMutation.isPending}
            autoFocus
            className="h-8"
          />
        ) : (
          <span className="text-sm font-medium truncate">{status.name}</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isEditing ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              disabled={!editName.trim() || updateStatusMutation.isPending}
              className="h-8 px-2"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={updateStatusMutation.isPending}
              className="h-8 px-2"
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            {/* Move Up/Down */}
            <Button
              size="icon"
              variant="ghost"
              onClick={onMoveUp}
              disabled={isFirst}
              className="h-8 w-8"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onMoveDown}
              disabled={isLast}
              className="h-8 w-8"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>

            {/* Edit */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Status</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{status.name}"? Ideas with
                    this status will have their status removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteStatusMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}
