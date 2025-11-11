import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@hintboard/ui/component";
import { Trash2, Hash } from "lucide-react";
import { TopicsService } from "@hintboard/supabase/services";

interface TopicItemProps {
  topic: any;
  organizationId: string;
}

export function TopicItem({ topic, organizationId }: TopicItemProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => TopicsService.deleteTopic(topic.id, "client"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics", organizationId] });
    },
  });

  return (
    <div className="flex items-center justify-between w-full bg-accent/50 px-4 py-3 rounded-md border border-border hover:border-accent-foreground/20 transition-colors">
      <div className="flex items-center gap-3">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{topic.name}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
