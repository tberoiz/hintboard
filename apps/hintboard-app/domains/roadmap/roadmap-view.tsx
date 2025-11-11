"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
} from "@dnd-kit/core";

import { RoadmapCard } from "./roadmap-card";
import { IdeaWithUserInfo } from "@hintboard/supabase/services";
import { RoadmapService, RoadmapData } from "@hintboard/supabase/services";
import { toast } from "sonner";
import { useOrganization } from "@/shared/contexts/organizations-context";
import { useRouter } from "next/navigation";
import { EditIdeaSheet } from "../ideas/components/sheets/edit-idea-sheet";
import { RoadmapColumn } from "./roadmap-column";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@hintboard/ui/component";
import { Kanban } from "lucide-react";

interface RoadmapViewProps {
  initialData: RoadmapData;
  organizationId: string;
}

export function RoadmapView({ initialData, organizationId }: RoadmapViewProps) {
  const router = useRouter();
  const { organization } = useOrganization();
  const [roadmapData, setRoadmapData] = useState(initialData);
  const [activeIdea, setActiveIdea] = useState<IdeaWithUserInfo | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<IdeaWithUserInfo | null>(
    null,
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Check if user can drag (modify roadmap)
  const canModify = RoadmapService.canModifyRoadmap(organization?.role);

  // Only enable drag and drop after mounting (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!canModify) return;

    const { active } = event;
    const ideaId = active.id as string;

    // Find the idea being dragged
    let foundIdea: IdeaWithUserInfo | null = null;
    for (const column of roadmapData.columns) {
      const idea = column.ideas.find((i) => i.idea_id === ideaId);
      if (idea) {
        foundIdea = idea;
        break;
      }
    }
    if (!foundIdea) {
      foundIdea =
        roadmapData.noStatusIdeas.find((i) => i.idea_id === ideaId) || null;
    }

    setActiveIdea(foundIdea);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!canModify) return;

    const { active, over } = event;
    setActiveIdea(null);

    // If dropped outside any droppable area, do nothing
    if (!over) return;

    const ideaId = active.id as string;
    const overId = over.id as string;

    // Validate that the drop target is a valid column
    const isValidDropTarget =
      overId === "no-status" ||
      roadmapData.columns.some((col) => col.id === overId);

    // If dropped on an invalid target, do nothing
    if (!isValidDropTarget) return;

    const newStatusId = overId === "no-status" ? null : overId;

    // Find the current status of the idea
    let currentStatusId: string | null = null;
    for (const column of roadmapData.columns) {
      if (column.ideas.some((i) => i.idea_id === ideaId)) {
        currentStatusId = column.id;
        break;
      }
    }

    // If dropped in the same status, do nothing
    if (currentStatusId === newStatusId) return;

    // Store previous state for rollback
    const previousData = roadmapData;

    // Optimistically update UI
    setRoadmapData((prev) => {
      const newColumns = prev.columns.map((col) => ({
        ...col,
        ideas: col.ideas.filter((i) => i.idea_id !== ideaId),
      }));

      let movedIdea: IdeaWithUserInfo | null = null;

      // Find and remove the idea from its current location
      for (const col of prev.columns) {
        const idea = col.ideas.find((i) => i.idea_id === ideaId);
        if (idea) {
          movedIdea = { ...idea, status_id: newStatusId };
          break;
        }
      }

      if (!movedIdea) {
        const idea = prev.noStatusIdeas.find((i) => i.idea_id === ideaId);
        if (idea) {
          movedIdea = { ...idea, status_id: newStatusId };
        }
      }

      if (!movedIdea) return prev;

      // Add to new location
      if (newStatusId === null) {
        return {
          columns: newColumns,
          noStatusIdeas: [
            ...prev.noStatusIdeas.filter((i) => i.idea_id !== ideaId),
            movedIdea,
          ],
        };
      } else {
        const updatedColumns = newColumns.map((col) => {
          if (col.id === newStatusId) {
            return {
              ...col,
              ideas: [...col.ideas, movedIdea!],
            };
          }
          return col;
        });

        return {
          columns: updatedColumns,
          noStatusIdeas: prev.noStatusIdeas.filter((i) => i.idea_id !== ideaId),
        };
      }
    });

    // Update in database
    try {
      await RoadmapService.updateIdeaStatus(ideaId, newStatusId, "client");
      toast.success("Idea status updated");
      router.refresh();
    } catch (error) {
      console.error("Failed to update idea status:", error);
      toast.error("Failed to update idea status");
      // Revert optimistic update
      setRoadmapData(previousData);
    }
  };

  const handleIdeaClick = (idea: IdeaWithUserInfo) => {
    setSelectedIdea(idea);
    setIsSheetOpen(true);
  };

  const handleSheetClose = () => {
    setIsSheetOpen(false);
    // Refresh data after closing sheet
    router.refresh();
  };

  // Check if there are any ideas at all
  const hasNoIdeas =
    roadmapData.noStatusIdeas.length === 0 &&
    roadmapData.columns.every((col) => col.ideas.length === 0);

  // If there are no ideas at all, show empty state
  if (hasNoIdeas) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Kanban />
            </EmptyMedia>
            <EmptyTitle>No ideas in your roadmap yet</EmptyTitle>
            <EmptyDescription>
              Start by creating ideas and assigning them to different statuses
              to build your roadmap.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const roadmapContent = (
    <div
      className="h-full w-full overflow-x-auto overflow-y-hidden"
      style={{ display: "block" } as React.CSSProperties}
    >
      <div
        className="flex gap-4 p-6 pb-20 flex-nowrap"
        style={
          {
            width: "max-content",
            display: "inline-flex",
          } as React.CSSProperties
        }
      >
        {/* No Status Column */}
        {roadmapData.noStatusIdeas.length > 0 && (
          <RoadmapColumn
            id="no-status"
            title="No Status"
            color="#6b7280" // Gray-500 as default for no status
            ideas={roadmapData.noStatusIdeas}
            canDrag={canModify && isMounted}
            onIdeaClick={handleIdeaClick}
          />
        )}

        {/* Status Columns - Now using color from column data */}
        {roadmapData.columns.map((column) => (
          <RoadmapColumn
            key={column.id}
            id={column.id}
            title={column.name}
            color={column.color} // Use color from status directly
            ideas={column.ideas}
            canDrag={canModify && isMounted}
            onIdeaClick={handleIdeaClick}
          />
        ))}
      </div>
    </div>
  );

  return (
    <>
      {isMounted ? (
        <DndContext
          sensors={canModify ? sensors : []}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {roadmapContent}

          <DragOverlay dropAnimation={null}>
            {activeIdea ? (
              <div
                style={{
                  transform: "rotate(6deg)",
                  cursor: "grabbing",
                }}
                className="shadow-2xl"
              >
                <RoadmapCard
                  idea={activeIdea}
                  isDragging={false}
                  canDrag={canModify}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        roadmapContent
      )}

      {/* Edit Idea Sheet */}
      {selectedIdea && (
        <EditIdeaSheet
          idea={selectedIdea}
          isOpen={isSheetOpen}
          onOpenChange={handleSheetClose}
        />
      )}
    </>
  );
}
