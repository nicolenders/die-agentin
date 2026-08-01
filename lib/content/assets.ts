import type { TiptapDoc, TiptapNode } from "./schema";

// Auflösung von Medien-Referenzen für den Renderer. Der Aufrufer (öffentliche
// Seite bzw. Editor-Vorschau) sammelt die referenzierten Asset-IDs, lädt die
// zugehörigen `MediaAsset`s und übergibt eine `AssetMap` an den Renderer.

export interface ResolvedAsset {
  id: string;
  url: string;
  alt: string;
  width?: number;
  height?: number;
  credit?: string | null;
  decorative?: boolean;
}

export type AssetMap = Record<string, ResolvedAsset>;

/** Sammelt alle in einem Dokument referenzierten Asset-IDs. */
export function collectAssetIds(doc: TiptapDoc): string[] {
  const ids = new Set<string>();

  function visit(node: TiptapNode): void {
    if (node.type === "image") {
      const id = node.attrs?.assetId;
      if (typeof id === "string") ids.add(id);
    }
    if (node.type === "gallery") {
      const arr = node.attrs?.assetIds;
      if (Array.isArray(arr)) {
        for (const id of arr) if (typeof id === "string") ids.add(id);
      }
    }
    if (node.type === "paragraph") {
      const margin = node.attrs?.marginAsset as { assetId?: unknown } | undefined;
      if (typeof margin?.assetId === "string") ids.add(margin.assetId);
    }
    node.content?.forEach(visit);
  }

  doc.content.forEach(visit);
  return [...ids];
}
