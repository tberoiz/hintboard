"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@hintboard/ui/component";
import { Sparkles } from "lucide-react";
import { IdeasService, IdeaWithUserInfo } from "@hintboard/supabase/services";

interface GenerateFromIdeasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName?: string;
  onGenerate: (content: string, selectedIdeaIds: string[]) => Promise<void>;
  title?: string;
  description?: string;
  generateButtonText?: string;
}

export function GenerateFromIdeasModal({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  onGenerate,
  title = "Generate from Ideas",
  description = "Select ideas to include in your AI-generated content",
  generateButtonText = "Generate",
}: GenerateFromIdeasModalProps) {
  const [ideas, setIdeas] = useState<IdeaWithUserInfo[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Load ideas when modal opens
  useEffect(() => {
    if (open && organizationId) {
      loadIdeas();
    }
  }, [open, organizationId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      setError("");
    }
  }, [open]);

  const loadIdeas = async () => {
    setLoadingIdeas(true);
    setError("");

    try {
      const allIdeas = await IdeasService.getFilteredIdeas(
        organizationId,
        null,
        null,
        "client",
      );
      setIdeas(allIdeas);
    } catch (err) {
      console.error("Error fetching ideas:", err);
      setError("Failed to load ideas");
    } finally {
      setLoadingIdeas(false);
    }
  };

  const toggleIdea = (ideaId: string) => {
    setSelectedIds((prev) =>
      prev.includes(ideaId)
        ? prev.filter((id) => id !== ideaId)
        : [...prev, ideaId],
    );
  };

  const selectAll = () => {
    setSelectedIds(ideas.map((idea) => idea.idea_id));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  const handleGenerate = async () => {
    if (selectedIds.length === 0) {
      setError("Please select at least one idea");
      return;
    }

    try {
      setGenerating(true);
      setError("");

      // Call the API to generate content
      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ideaIds: selectedIds,
          organizationId: organizationId,
          organizationName: organizationName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate content");
      }

      // Call the parent's onGenerate callback with the generated content
      await onGenerate(data, selectedIds);
      // Close modal on success
      onOpenChange(false);
    } catch (err) {
      console.error("Error generating content:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate content",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Selection Controls */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} idea{selectedIds.length !== 1 ? "s" : ""}{" "}
              selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={loadingIdeas}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={loadingIdeas}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Ideas List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {loadingIdeas ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading ideas...
              </div>
            ) : ideas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No ideas found
              </div>
            ) : (
              ideas.map((idea) => (
                <label
                  key={idea.idea_id}
                  className={`block p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedIds.includes(idea.idea_id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(idea.idea_id)}
                      onChange={() => toggleIdea(idea.idea_id)}
                      className="mt-1 h-4 w-4 rounded border-input"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{idea.title}</h3>
                        {idea.is_bug && (
                          <Badge variant="destructive" className="text-xs">
                            Bug
                          </Badge>
                        )}
                      </div>

                      {idea.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {idea.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {idea.status_name && (
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: `${idea.status_color}20`,
                              color: idea.status_color,
                              borderColor: `${idea.status_color}40`,
                            }}
                          >
                            {idea.status_name}
                          </Badge>
                        )}
                        {idea.vote_count > 0 && (
                          <span>👍 {idea.vote_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <div className="mt-4 pt-4 border-t">
            <Button
              onClick={handleGenerate}
              disabled={selectedIds.length === 0 || generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {generateButtonText} ({selectedIds.length} ideas)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
