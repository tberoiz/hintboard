"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { AnnouncementsService } from "@hintboard/supabase/services";
import { Input } from "@hintboard/ui/component";
import { useOrganization } from "@/shared/contexts/organizations-context";
import { BlockEditor } from "../editor/block-editor";
import { CategorySelector } from "../editor/category-selector";
import { EditorHeader } from "../editor/editor-header";
import { EditorBlock, Category } from "../types";
import { generateId } from "../utils/id-generator";
import { parseMarkdownToBlocks } from "../utils/markdown-parser";

export function AnnouncementEditor() {
  const router = useRouter();
  const params = useParams();
  const { organization } = useOrganization();
  const announcementId = params?.id as string | undefined;
  const isEditing = !!announcementId;

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isInitialized, setIsInitialized] = useState(false);

  // History management for undo/redo
  const [history, setHistory] = useState<
    { title: string; blocks: EditorBlock[] }[]
  >([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  // Initialize blocks on client side only
  useEffect(() => {
    if (!isInitialized && blocks.length === 0 && !isEditing) {
      setBlocks([{ id: generateId(), type: "paragraph", content: "" }]);
      setIsInitialized(true);
    }
  }, [isInitialized, blocks.length, isEditing]);

  // Save to history whenever title or blocks change
  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    const currentState = { title, blocks };

    // Don't save if it's the initial empty state
    if (
      title === "" &&
      blocks.length === 1 &&
      blocks[0] &&
      blocks[0].content === "" &&
      history.length === 0
    ) {
      return;
    }

    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      return newHistory.slice(-50);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [title, blocks, history.length, historyIndex]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();

        if (e.shiftKey) {
          // Redo: Cmd+Shift+Z
          if (historyIndex < history.length - 1) {
            isUndoRedoAction.current = true;
            const nextState = history[historyIndex + 1];
            if (nextState) {
              setTitle(nextState.title);
              setBlocks(nextState.blocks);
              setHistoryIndex((prev) => prev + 1);
            }
          }
        } else {
          // Undo: Cmd+Z
          if (historyIndex > 0) {
            isUndoRedoAction.current = true;
            const prevState = history[historyIndex - 1];
            if (prevState) {
              setTitle(prevState.title);
              setBlocks(prevState.blocks);
              setHistoryIndex((prev) => prev - 1);
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, historyIndex]);

  useEffect(() => {
    if (isEditing) {
      loadAnnouncement();
    }
    if (organization?.id) {
      loadCategories();
    }
  }, [announcementId, organization?.id]);

  const loadAnnouncement = async () => {
    try {
      const announcement = await AnnouncementsService.getAnnouncement(
        announcementId!,
        "client",
      );

      if (announcement) {
        setTitle(announcement.title);

        if (organization?.id) {
          const details =
            await AnnouncementsService.getAnnouncementsWithDetails(
              organization.id,
              undefined,
              "client",
            );
          const announcementDetail = details.find(
            (a) => a.id === announcementId,
          );
          if (announcementDetail?.categories) {
            setSelectedCategoryIds(
              announcementDetail.categories.map((c) => c.id),
            );
          }
        }

        if (announcement.content?.blocks) {
          setBlocks(announcement.content.blocks);
        } else if (typeof announcement.content === "string") {
          const parsedBlocks = parseMarkdownToBlocks(announcement.content);
          setBlocks(parsedBlocks);
        }
      }
    } catch (error) {
      console.error("Failed to load announcement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!organization?.id) return;

    try {
      const cats = await AnnouncementsService.getCategories(
        organization.id,
        "client",
      );
      setCategories(cats);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const updateBlock = (id: string, updates: Partial<EditorBlock>) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, ...updates } : block)),
    );
  };

  const addBlock = (
    afterId: string,
    type: EditorBlock["type"] = "paragraph",
  ) => {
    const index = blocks.findIndex((b) => b.id === afterId);
    const newBlock: EditorBlock = {
      id: generateId(),
      type,
      content: "",
    };
    setBlocks((prev) => [
      ...prev.slice(0, index + 1),
      newBlock,
      ...prev.slice(index + 1),
    ]);

    setTimeout(() => {
      const newBlockElement = document.querySelector(
        `[data-block-id="${newBlock.id}"]`,
      );
      if (newBlockElement) {
        const textarea = newBlockElement.querySelector("textarea");
        const input = newBlockElement.querySelector("input");
        if (textarea) textarea.focus();
        else if (input) input.focus();
      }
    }, 0);
  };

  const deleteBlock = (id: string) => {
    if (blocks.length === 1) return;
    setBlocks((prev) => prev.filter((block) => block.id !== id));
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    if (!organization?.id) {
      alert("Organization not found");
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing) {
        await AnnouncementsService.updateAnnouncement(
          announcementId!,
          {
            title,
            content: { blocks },
            status,
            categoryIds: selectedCategoryIds,
          },
          "client",
        );
        router.push(`/announcements/${announcementId}`);
      } else {
        const newAnnouncement = await AnnouncementsService.createAnnouncement(
          {
            organization_id: organization.id,
            title,
            content: { blocks },
            status,
            categoryIds: selectedCategoryIds,
          },
          "client",
        );
        router.push(`/announcements/${newAnnouncement.id}`);
      }
    } catch (error) {
      console.error("Failed to save announcement:", error);
      alert("Failed to save announcement");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      <EditorHeader
        onBack={() => router.back()}
        onSaveDraft={() => handleSave("draft")}
        onPublish={() => handleSave("published")}
        isSaving={isSaving}
      />

      <div className="max-w-4xl mx-auto px-6 py-12 pb-[50vh]">
        <div className="bg-card rounded-lg border p-12">
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title..."
            className="w-full text-4xl font-semibold border-none outline-none bg-transparent placeholder:text-muted-foreground/30 mb-4 h-auto px-0 focus-visible:ring-0"
          />

          <CategorySelector
            categories={categories}
            selectedCategoryIds={selectedCategoryIds}
            onToggleCategory={toggleCategory}
            onManageCategories={() => router.push("/settings?tab=categories")}
          />

          <div className="space-y-4">
            {blocks.map((block) => (
              <BlockEditor
                key={block.id}
                block={block}
                onUpdate={(updates) => updateBlock(block.id, updates)}
                onAdd={(type) => addBlock(block.id, type)}
                onDelete={() => deleteBlock(block.id)}
                canDelete={blocks.length > 1}
                onEnter={() => addBlock(block.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
