"use client";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ScrollArea, Button, Separator, Card } from "@hintboard/ui/component";
import { cn } from "@hintboard/ui/utils";
import { RoadmapCard } from "./roadmap-card";
import { IdeaWithUserInfo } from "@hintboard/supabase/services";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@hintboard/ui/component";

interface RoadmapColumnProps {
  id: string;
  title: string;
  color: string; // Now expects hex color like "#3b82f6"
  ideas: IdeaWithUserInfo[];
  canDrag: boolean;
  onIdeaClick: (idea: IdeaWithUserInfo) => void;
}

export function RoadmapColumn({
  id,
  title,
  color = "#3b82f6",
  ideas,
  canDrag,
  onIdeaClick,
}: RoadmapColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    disabled: !canDrag,
  });

  const ideaIds = ideas.map((idea) => idea.idea_id);

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "w-[320px] min-w-[320px] max-w-[320px] flex-shrink-0 flex flex-col border shadow-sm bg-card transition-all duration-200 select-none",
        canDrag &&
          isOver &&
          "ring-2 ring-primary bg-primary/5 border-primary/50",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h2 className="text-sm font-medium">{title}</h2>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {ideas.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </Button>
      </div>
      <Separator />

      {/* Scrollable list of cards */}
      <div ref={setNodeRef} className="flex-1 min-h-[200px]">
        <ScrollArea className="h-full p-3">
          <SortableContext
            items={ideaIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {ideas.length === 0 ? (
                <Empty className="py-8">
                  <EmptyHeader>
                    <EmptyTitle className="text-sm">No ideas yet</EmptyTitle>
                    <EmptyDescription className="text-xs">
                      {canDrag
                        ? "Drag ideas here to get started"
                        : "No ideas in this status"}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                ideas.map((idea) => (
                  <RoadmapCard
                    key={idea.idea_id}
                    idea={idea}
                    canDrag={canDrag}
                    onClick={() => onIdeaClick(idea)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>
    </Card>
  );
}
