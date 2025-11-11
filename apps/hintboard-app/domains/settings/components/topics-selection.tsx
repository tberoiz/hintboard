import { useState } from "react";
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
import { TopicsService } from "@hintboard/supabase/services";
import { TopicItem } from "./topic-item";

interface TopicsSectionProps {
  organizationId: string;
}

export function TopicsSection({ organizationId }: TopicsSectionProps) {
  const [topicName, setTopicName] = useState("");
  const queryClient = useQueryClient();

  // Fetch topics
  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ["topics", organizationId],
    queryFn: () => TopicsService.getTopics(organizationId, "client"),
    enabled: !!organizationId,
  });

  // Create topic mutation
  const createTopicMutation = useMutation({
    mutationFn: (name: string) =>
      TopicsService.createTopic(organizationId, name, "client"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics", organizationId] });
      setTopicName("");
    },
  });

  const handleAddTopic = () => {
    if (!topicName.trim()) return;
    createTopicMutation.mutate(topicName.trim());
  };

  const handleTopicKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTopic();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Topics</CardTitle>
        <CardDescription>
          Add Topics so that users can tag them when creating Ideas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              id="topic-name"
              placeholder="Topic name"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              onKeyPress={handleTopicKeyPress}
              disabled={createTopicMutation.isPending}
            />
          </div>
          <Button
            onClick={handleAddTopic}
            disabled={!topicName.trim() || createTopicMutation.isPending}
            className="sm:w-auto"
          >
            Add Topic
          </Button>
        </div>

        <div className="space-y-2 mt-6">
          {topicsLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Loading topics...
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No topics yet. Add your first topic above.
            </div>
          ) : (
            topics.map((topic) => (
              <TopicItem
                key={topic.id}
                topic={topic}
                organizationId={organizationId}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
