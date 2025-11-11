"use client";

import {
  Type,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Image,
  Minus,
} from "lucide-react";
import { EditorBlock } from "../types";

interface BlockMenuProps {
  position: "top" | "bottom";
  onSelectType: (type: EditorBlock["type"]) => void;
  onClose: () => void;
}

export function BlockMenu({ position, onSelectType, onClose }: BlockMenuProps) {
  return (
    <div
      className={`absolute left-0 ${
        position === "top" ? "bottom-full mb-2" : "top-full mt-2"
      } bg-popover border rounded-md shadow-lg z-20 py-1 min-w-[200px]`}
    >
      <button
        onClick={() => onSelectType("paragraph")}
        className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-3 text-sm"
      >
        <Type className="w-4 h-4" />
        <span>Text</span>
      </button>
      <button
        onClick={() => onSelectType("h1")}
        className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-3 text-sm"
      >
        <Heading1 className="w-4 h-4" />
        <span>Heading 1</span>
      </button>
      <button
        onClick={() => onSelectType("h2")}
        className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-3 text-sm"
      >
        <Heading2 className="w-4 h-4" />
        <span>Heading 2</span>
      </button>
      <button
        onClick={() => onSelectType("bullet-list")}
        className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-3 text-sm"
      >
        <List className="w-4 h-4" />
        <span>Bullet List</span>
      </button>
      <button
        onClick={() => onSelectType("numbered-list")}
        className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-3 text-sm"
      >
        <ListOrdered className="w-4 h-4" />
        <span>Numbered List</span>
      </button>
      <button
        onClick={() => onSelectType("image")}
        className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-3 text-sm"
      >
        <Image className="w-4 h-4" />
        <span>Image</span>
      </button>
      <button
        onClick={() => onSelectType("divider")}
        className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-3 text-sm"
      >
        <Minus className="w-4 h-4" />
        <span>Divider</span>
      </button>
      <div className="border-t my-1" />
      <button
        onClick={onClose}
        className="w-full px-4 py-2 text-left hover:bg-accent text-muted-foreground text-sm"
      >
        Cancel
      </button>
    </div>
  );
}
