export interface EditorBlock {
  id: string;
  type:
    | "paragraph"
    | "h1"
    | "h2"
    | "image"
    | "divider"
    | "bullet-list"
    | "numbered-list"
    | "button";
  content: string;
  buttonUrl?: string; // URL for button block
  buttonStyle?: "primary" | "secondary" | "outline"; // Style variants
}

export interface Category {
  id: string;
  name: string;
  color: string;
}
