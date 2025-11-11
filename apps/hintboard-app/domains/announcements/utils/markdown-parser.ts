import { EditorBlock } from "../types";
import { generateId } from "./id-generator";

export const parseMarkdownToBlocks = (markdown: string): EditorBlock[] => {
  const lines = markdown.split("\n");
  const blocks: EditorBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line) {
      i++;
      continue;
    }

    // Skip empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Check for heading 1 (# or ===)
    if (line.startsWith("# ")) {
      blocks.push({
        id: generateId(),
        type: "h1",
        content: line.replace(/^# /, "").trim(),
      });
      i++;
      continue;
    }

    // Check for heading 2 (## or ---)
    if (line.startsWith("## ") || line.startsWith("### ")) {
      blocks.push({
        id: generateId(),
        type: "h2",
        content: line.replace(/^#{2,3} /, "").trim(),
      });
      i++;
      continue;
    }

    // Check for divider (---, ***, ___)
    if (/^[-*_]{3,}$/.test(line.trim())) {
      blocks.push({
        id: generateId(),
        type: "divider",
        content: "",
      });
      i++;
      continue;
    }

    // Check for bullet list (-, *, +)
    if (/^[\s]*[-*+]\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length) {
        const currentLine = lines[i];
        if (!currentLine || !/^[\s]*[-*+]\s/.test(currentLine)) break;
        listItems.push(currentLine.replace(/^[\s]*[-*+]\s/, "").trim());
        i++;
      }
      listItems.forEach((item) => {
        blocks.push({
          id: generateId(),
          type: "bullet-list",
          content: item,
        });
      });
      continue;
    }

    // Check for numbered list
    if (/^[\s]*\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length) {
        const currentLine = lines[i];
        if (!currentLine || !/^[\s]*\d+\.\s/.test(currentLine)) break;
        listItems.push(currentLine.replace(/^[\s]*\d+\.\s/, "").trim());
        i++;
      }
      listItems.forEach((item) => {
        blocks.push({
          id: generateId(),
          type: "numbered-list",
          content: item,
        });
      });
      continue;
    }

    // Check for image (![alt](url))
    const imageMatch = line.match(/!\[.*?\]\((.*?)\)/);
    if (imageMatch && imageMatch[1]) {
      blocks.push({
        id: generateId(),
        type: "image",
        content: imageMatch[1],
      });
      i++;
      continue;
    }

    // Default to paragraph
    // Collect multiple lines into one paragraph until empty line or special syntax
    let paragraphContent = line;
    i++;
    while (i < lines.length) {
      const nextLine = lines[i];
      if (
        !nextLine ||
        nextLine.trim() === "" ||
        nextLine.startsWith("#") ||
        /^[-*_]{3,}$/.test(nextLine.trim()) ||
        /^[\s]*[-*+]\s/.test(nextLine) ||
        /^[\s]*\d+\.\s/.test(nextLine) ||
        nextLine.match(/!\[.*?\]\(.*?\)/)
      ) {
        break;
      }
      paragraphContent += "\n" + nextLine;
      i++;
    }

    blocks.push({
      id: generateId(),
      type: "paragraph",
      content: paragraphContent.trim(),
    });
  }

  // Return at least one empty block if no content
  return blocks.length > 0
    ? blocks
    : [{ id: generateId(), type: "paragraph", content: "" }];
};
