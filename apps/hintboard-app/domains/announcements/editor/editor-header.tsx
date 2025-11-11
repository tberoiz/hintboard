"use client";

import { Button } from "@hintboard/ui/component";
import { ArrowLeft, Save, Send } from "lucide-react";

interface EditorHeaderProps {
  onBack: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  isSaving: boolean;
}

export function EditorHeader({
  onBack,
  onSaveDraft,
  onPublish,
  isSaving,
}: EditorHeaderProps) {
  return (
    <div className="bg-card border-b sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </Button>
          <Button onClick={onPublish} disabled={isSaving} className="gap-2">
            <Send className="w-4 h-4" />
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
