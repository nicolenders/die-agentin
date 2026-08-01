// Inhaltsmodell (SPEC §4). Der Editor speichert ein TipTap-JSON-Dokument.
// Diese Datei definiert die erlaubten Node-Typen, Marks und den Kontext, in dem
// bestimmte Bausteine verfügbar sind. Sie ist die Autorität für `sanitize.ts`.

export type ContentContext = "post" | "dossier" | "mission";

export type MarginSide = "left" | "right";
export type ImageLayout = "full" | "left" | "right";

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapDoc {
  type: "doc";
  content: TiptapNode[];
}

// Node-Typen, die in JEDEM Kontext erlaubt sind (SPEC §4).
const BASE_NODES = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "image",
  "divider",
  "horizontalRule", // StarterKit-Name des Trenners (Alias von divider)
  "text",
  "hardBreak",
] as const;

// Zusätzliche Node-Typen je Kontext.
const EXTRA_NODES: Record<ContentContext, readonly string[]> = {
  post: ["linkCard"],
  dossier: ["gallery", "video", "videoGallery", "toc"],
  mission: ["gallery"],
};

export const ALLOWED_MARKS = new Set([
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
]);

/** Menge der in einem Kontext erlaubten Node-Typen. */
export function allowedNodesFor(context: ContentContext): Set<string> {
  return new Set<string>([...BASE_NODES, ...EXTRA_NODES[context]]);
}

/** Ein leeres, gültiges Dokument. */
export function emptyDoc(): TiptapDoc {
  return { type: "doc", content: [] };
}

/** Prüft grob, ob ein Wert wie ein TipTap-Dokument aussieht. */
export function isTiptapDoc(value: unknown): value is TiptapDoc {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "doc" &&
    Array.isArray((value as { content?: unknown }).content)
  );
}
