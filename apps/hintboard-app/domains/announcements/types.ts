export interface EditorBlock {
  id: string;
  type:
    | "paragraph"
    | "h1"
    | "h2"
    | "image"
    | "divider"
    | "bullet-list"
    | "numbered-list";
  content: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}
