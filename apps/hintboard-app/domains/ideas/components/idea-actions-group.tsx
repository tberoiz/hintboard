"use client";

import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button, ButtonGroup } from "@hintboard/ui/component";
import { IdeasService, IdeaWithUserInfo } from "@hintboard/supabase/services";
import { Bug, Pin, PinOff, Lock, LockOpen } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface IdeaActionsGroupProps {
  idea: IdeaWithUserInfo;
  organizationRole?: string;
  onActionComplete?: () => void;
}

export const IdeaActionsGroup: React.FC<IdeaActionsGroupProps> = ({
  idea,
  organizationRole,
  onActionComplete,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [isBug, setIsBug] = useState(idea.is_bug);
  const [isPinned, setIsPinned] = useState((idea as any).is_pinned || false);
  const [isPrivate, setIsPrivate] = useState(idea.is_private || false);

  const queryClient = useQueryClient();

  const refresh = () => {
    router.refresh();
    onActionComplete?.();
  };

  const toggleFlag = async (
    field: string,
    newValue: boolean,
    label: string,
  ) => {
    setLoading(true);
    try {
      await IdeasService.updateAdminFlags(
        idea.idea_id,
        { [field]: newValue },
        "client",
      );
      toast.success(`Idea ${label}`);
      refresh();
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error);
      toast.error(error.message || `Failed to update ${field}.`);
    } finally {
      queryClient.invalidateQueries({ queryKey: ["filtered-ideas"] });

      setLoading(false);
    }
  };

  return (
    <>
      {organizationRole !== "guest" && (
        <ButtonGroup orientation="vertical">
          {/* 🐞 Bug toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              const newState = !isBug;
              setIsBug(newState);
              toggleFlag(
                "is_bug",
                newState,
                newState ? "marked as bug" : "unmarked as bug",
              );
            }}
            disabled={loading}
            title={isBug ? "Unmark as Bug" : "Mark as Bug"}
            className={
              isBug
                ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                : "text-muted-foreground hover:bg-accent"
            }
          >
            <Bug
              className={`w-4 h-4 ${
                isBug ? "text-red-600 fill-red-600" : "text-muted-foreground"
              }`}
            />
          </Button>

          {/* 📌 Pin toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              const newState = !isPinned;
              setIsPinned(newState);
              toggleFlag(
                "is_pinned",
                newState,
                newState ? "pinned" : "unpinned",
              );
            }}
            disabled={loading}
            title={isPinned ? "Unpin Idea" : "Pin Idea"}
            className={
              isPinned
                ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                : "text-muted-foreground hover:bg-accent"
            }
          >
            {isPinned ? (
              <PinOff className="w-4 h-4 text-amber-600 fill-amber-600" />
            ) : (
              <Pin className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>

          {/* 🔒 Privacy toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              const newState = !isPrivate;
              setIsPrivate(newState);
              toggleFlag(
                "is_private",
                newState,
                newState ? "made private" : "made public",
              );
            }}
            disabled={loading}
            title={isPrivate ? "Make Public" : "Make Private"}
            className={
              isPrivate
                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                : "text-muted-foreground hover:bg-accent"
            }
          >
            {isPrivate ? (
              <Lock className="w-4 h-4 text-muted-foreground" />
            ) : (
              <LockOpen className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        </ButtonGroup>
      )}
    </>
  );
};
