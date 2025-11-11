import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Button,
} from "@hintboard/ui/component";
import { StatusesService } from "@hintboard/supabase/services";
import { StatusItem } from "./statuses-item";
import { usePrimaryColor } from "@/shared/hooks/use-primary-color";

interface StatusesSectionProps {
  organizationId: string;
}

export function StatusesSection({ organizationId }: StatusesSectionProps) {
  const [statusName, setStatusName] = useState("");
  const primaryColor = usePrimaryColor();
  const [statusColor, setStatusColor] = useState(primaryColor);
  const queryClient = useQueryClient();

  // Fetch statuses
  const { data: statuses = [], isLoading: statusesLoading } = useQuery({
    queryKey: ["statuses", organizationId],
    queryFn: () => StatusesService.getStatuses(organizationId, "client"),
    enabled: !!organizationId,
  });

  // Create status mutation
  const createStatusMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      StatusesService.createStatus(
        organizationId,
        data.name,
        data.color,
        "client",
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statuses", organizationId] });
      setStatusName("");
      setStatusColor(primaryColor);
    },
  });

  // Reorder statuses mutation
  const reorderStatusesMutation = useMutation({
    mutationFn: (updates: Array<{ id: string; sort_order: number }>) =>
      StatusesService.reorderStatuses(updates, "client"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statuses", organizationId] });
    },
  });

  // Update color when primary color changes
  useEffect(() => {
    if (primaryColor) {
      setStatusColor(primaryColor);
    }
  }, [primaryColor]);

  const handleAddStatus = () => {
    if (!statusName.trim()) return;
    createStatusMutation.mutate({
      name: statusName.trim(),
      color: statusColor,
    });
  };

  const handleMoveStatus = (index: number, direction: "up" | "down") => {
    const newStatuses = [...statuses];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newStatuses.length) return;

    [newStatuses[index], newStatuses[targetIndex]] = [
      newStatuses[targetIndex],
      newStatuses[index],
    ];

    const updates = newStatuses.map((status, idx) => ({
      id: status.id,
      sort_order: idx,
    }));

    reorderStatusesMutation.mutate(updates);
  };

  const handleStatusKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddStatus();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statuses</CardTitle>
        <CardDescription>
          Create and manage workflow statuses for your ideas. Drag to reorder
          them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              id="status-name"
              placeholder="Status name (e.g., In Progress, Done)"
              value={statusName}
              onChange={(e) => setStatusName(e.target.value)}
              onKeyPress={handleStatusKeyPress}
              disabled={createStatusMutation.isPending}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={statusColor}
              onChange={(e) => setStatusColor(e.target.value)}
              className="h-10 w-16 rounded border border-border cursor-pointer"
              disabled={createStatusMutation.isPending}
            />
            <Button
              onClick={handleAddStatus}
              disabled={!statusName.trim() || createStatusMutation.isPending}
              className="sm:w-auto"
            >
              Add Status
            </Button>
          </div>
        </div>

        <div className="space-y-2 mt-6">
          {statusesLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Loading statuses...
            </div>
          ) : statuses.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No statuses yet. Add your first status above.
            </div>
          ) : (
            statuses.map((status, index) => (
              <StatusItem
                key={status.id}
                status={status}
                organizationId={organizationId}
                onMoveUp={() => handleMoveStatus(index, "up")}
                onMoveDown={() => handleMoveStatus(index, "down")}
                isFirst={index === 0}
                isLast={index === statuses.length - 1}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
