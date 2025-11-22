"use client";

import { useState, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hintboard/ui/component";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { EditorBlock } from "../types";
import { BlockMenu } from "./block-menu";

interface BlockEditorProps {
  block: EditorBlock;
  onUpdate: (updates: Partial<EditorBlock>) => void;
  onAdd: (type: EditorBlock["type"]) => void;
  onDelete: () => void;
  canDelete: boolean;
  onEnter: () => void;
}

export function BlockEditor({
  block,
  onUpdate,
  onAdd,
  onDelete,
  canDelete,
  onEnter,
}: BlockEditorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<"bottom" | "top">("bottom");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea on mount and content change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [block.content]);

  // Check menu position when it opens
  useEffect(() => {
    if (showMenu && textareaRef.current && menuRef.current) {
      const textareaRect = textareaRef.current.getBoundingClientRect();
      const menuHeight = 350;
      const spaceBelow = window.innerHeight - textareaRect.bottom;

      if (spaceBelow < menuHeight && textareaRect.top > menuHeight) {
        setMenuPosition("top");
      } else {
        setMenuPosition("bottom");
      }
    }
  }, [showMenu]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnter();
    }
    if (e.key === "Backspace" && block.content === "" && canDelete) {
      e.preventDefault();
      onDelete();
    }
    if (e.key === "/" && block.content === "") {
      e.preventDefault();
      setShowMenu(true);
    }
  };

  const selectType = (type: EditorBlock["type"]) => {
    onUpdate({ type, content: "" });
    setShowMenu(false);
  };

  if (block.type === "divider") {
    return (
      <div
        className="group relative flex items-center gap-2"
        data-block-id={block.id}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAdd("paragraph")}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-accent rounded"
          >
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-accent rounded">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {canDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex-1 py-4">
          <hr className="border-border" />
        </div>
      </div>
    );
  }

  if (block.type === "button") {
    return (
      <div
        className="group relative flex items-start gap-2"
        data-block-id={block.id}
      >
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => onAdd("paragraph")}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-accent rounded"
          >
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-accent rounded">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {canDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Button text..."
            className="w-full px-3 py-2 border border-input rounded-md outline-none focus:border-ring bg-background"
          />
          <input
            type="text"
            value={block.buttonUrl || ""}
            onChange={(e) => onUpdate({ buttonUrl: e.target.value })}
            placeholder="Button URL (e.g., https://example.com)"
            className="w-full px-3 py-2 border border-input rounded-md outline-none focus:border-ring bg-background"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate({ buttonStyle: "primary" })}
              className={`px-3 py-1 text-sm rounded border ${
                (block.buttonStyle || "primary") === "primary"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input"
              }`}
            >
              Primary
            </button>
            <button
              onClick={() => onUpdate({ buttonStyle: "secondary" })}
              className={`px-3 py-1 text-sm rounded border ${
                block.buttonStyle === "secondary"
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "bg-background border-input"
              }`}
            >
              Secondary
            </button>
            <button
              onClick={() => onUpdate({ buttonStyle: "outline" })}
              className={`px-3 py-1 text-sm rounded border ${
                block.buttonStyle === "outline"
                  ? "border-primary text-primary"
                  : "bg-background border-input"
              }`}
            >
              Outline
            </button>
          </div>
          {block.content && (
            <div className="mt-3">
              <button
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  block.buttonStyle === "secondary"
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : block.buttonStyle === "outline"
                      ? "border-2 border-primary text-primary hover:bg-primary/10"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {block.content}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div
        className="group relative flex items-start gap-2"
        data-block-id={block.id}
      >
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => onAdd("paragraph")}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-accent rounded"
          >
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-accent rounded">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {canDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Paste image URL..."
            className="w-full px-3 py-2 border border-input rounded-md outline-none focus:border-ring bg-background"
          />
          {block.content && (
            <div className="mt-3">
              <img
                src={block.content}
                alt=""
                className="max-w-full rounded-md"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const getClassName = () => {
    switch (block.type) {
      case "h1":
        return "text-3xl font-semibold";
      case "h2":
        return "text-2xl font-semibold";
      case "bullet-list":
        return "pl-6";
      case "numbered-list":
        return "pl-6";
      default:
        return "text-base font-medium";
    }
  };

  const getPlaceholder = () => {
    switch (block.type) {
      case "h1":
        return "Heading 1";
      case "h2":
        return "Heading 2";
      case "bullet-list":
        return "• List item";
      case "numbered-list":
        return "1. List item";
      default:
        return "Type / for commands...";
    }
  };

  return (
    <div
      className="group relative flex items-start gap-2"
      data-block-id={block.id}
    >
      <div
        className="flex items-center gap-1 flex-shrink-0"
        style={{
          marginTop:
            block.type === "h1"
              ? "0.5rem"
              : block.type === "h2"
                ? "0.35rem"
                : "0.15rem",
        }}
      >
        <button
          onClick={() => onAdd("paragraph")}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-accent rounded"
        >
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-accent rounded">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {canDelete && (
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 relative" ref={menuRef}>
        <textarea
          ref={textareaRef}
          value={block.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          rows={1}
          className={`w-full border-none outline-none resize-none overflow-hidden bg-transparent placeholder:text-muted-foreground/30 ${getClassName()}`}
          style={{
            minHeight: "1.5em",
          }}
        />

        {showMenu && (
          <BlockMenu
            position={menuPosition}
            onSelectType={selectType}
            onClose={() => setShowMenu(false)}
          />
        )}
      </div>
    </div>
  );
}
