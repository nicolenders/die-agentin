import {
  type ContentContext,
  type TiptapDoc,
  type TiptapNode,
  type TiptapMark,
  allowedNodesFor,
  ALLOWED_MARKS,
  emptyDoc,
  isTiptapDoc,
} from "./schema";

// Bereinigt ein gespeichertes TipTap-Dokument (SPEC §4, CLAUDE.md): unbekannte
// oder im Kontext unzulässige Node-Typen werden VERWORFEN, nicht durchgereicht.
// Marks werden auf die Allow-List reduziert; Attribute werden validiert. So kann
// der Renderer ohne dangerouslySetInnerHTML arbeiten.

function isSafeHref(href: unknown): href is string {
  if (typeof href !== "string" || href.length === 0) return false;
  const trimmed = href.trim().toLowerCase();
  // Kein javascript:, data: o. Ä. Erlaubt: http(s), mailto, relative/anchor.
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) {
    return false;
  }
  return true;
}

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function sanitizeMark(mark: TiptapMark): TiptapMark | null {
  if (!ALLOWED_MARKS.has(mark.type)) return null;
  if (mark.type === "link") {
    const href = mark.attrs?.href;
    if (!isSafeHref(href)) return null;
    const external = isExternal(href);
    return {
      type: "link",
      attrs: {
        href,
        // rel="noopener" erzwungen; externe Links markiert (SPEC §4).
        rel: external ? "noopener noreferrer" : "noopener",
        target: external ? "_blank" : undefined,
        "data-external": external ? "true" : undefined,
      },
    };
  }
  return { type: mark.type };
}

function sanitizeMarks(marks: TiptapMark[] | undefined): TiptapMark[] | undefined {
  if (!marks) return undefined;
  const cleaned = marks
    .map(sanitizeMark)
    .filter((m): m is TiptapMark => m !== null);
  return cleaned.length > 0 ? cleaned : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function sanitizeAttrs(node: TiptapNode): Record<string, unknown> | undefined {
  switch (node.type) {
    case "heading": {
      const level = node.attrs?.level;
      // Nur H2 und H3 (SPEC §4).
      return { level: level === 3 ? 3 : 2 };
    }
    case "paragraph": {
      const margin = node.attrs?.marginAsset as
        | { assetId?: unknown; side?: unknown; caption?: unknown }
        | undefined;
      const assetId = str(margin?.assetId);
      const side = margin?.side === "left" || margin?.side === "right" ? margin.side : undefined;
      if (assetId && side) {
        return { marginAsset: { assetId, side, caption: str(margin?.caption) } };
      }
      return undefined;
    }
    case "image": {
      const assetId = str(node.attrs?.assetId);
      if (!assetId) return undefined;
      const layoutRaw = node.attrs?.layout;
      const layout =
        layoutRaw === "left" || layoutRaw === "right" ? layoutRaw : "full";
      return { assetId, layout, caption: str(node.attrs?.caption) };
    }
    case "gallery": {
      const ids = Array.isArray(node.attrs?.assetIds)
        ? (node.attrs?.assetIds as unknown[]).filter(
            (id): id is string => typeof id === "string",
          )
        : [];
      return { assetIds: ids, caption: str(node.attrs?.caption) };
    }
    case "video": {
      const videoId = str(node.attrs?.videoId);
      if (!videoId) return undefined;
      return { provider: "youtube", videoId, title: str(node.attrs?.title) };
    }
    case "videoGallery": {
      const videos = Array.isArray(node.attrs?.videos)
        ? (node.attrs?.videos as unknown[])
            .map((v) => {
              const vid = str((v as { videoId?: unknown })?.videoId);
              return vid
                ? { provider: "youtube", videoId: vid, title: str((v as { title?: unknown }).title) }
                : null;
            })
            .filter((v): v is NonNullable<typeof v> => v !== null)
        : [];
      return { videos };
    }
    case "linkCard": {
      const url = node.attrs?.url;
      if (!isSafeHref(url)) return undefined;
      return {
        url,
        title: str(node.attrs?.title),
        site: str(node.attrs?.site),
        image: str(node.attrs?.image),
      };
    }
    case "codeBlock":
      return { language: str(node.attrs?.language) };
    default:
      return undefined;
  }
}

function sanitizeNode(node: TiptapNode, allowed: Set<string>): TiptapNode | null {
  if (typeof node?.type !== "string" || !allowed.has(node.type)) {
    return null; // verwerfen
  }

  // Für linkCard mit unsicherer URL kann sanitizeAttrs undefined liefern →
  // Node verwerfen, statt eine leere Karte zu rendern.
  const needsAttrs = node.type === "linkCard" || node.type === "image" || node.type === "video";
  const attrs = sanitizeAttrs(node);
  if (needsAttrs && attrs === undefined) return null;

  const cleaned: TiptapNode = { type: node.type };
  if (attrs) cleaned.attrs = attrs;

  if (node.type === "text") {
    cleaned.text = typeof node.text === "string" ? node.text : "";
    const marks = sanitizeMarks(node.marks);
    if (marks) cleaned.marks = marks;
    return cleaned;
  }

  if (Array.isArray(node.content)) {
    const content = node.content
      .map((child) => sanitizeNode(child, allowed))
      .filter((n): n is TiptapNode => n !== null);
    if (content.length > 0) cleaned.content = content;
  }

  return cleaned;
}

/**
 * Bereinigt ein Dokument für den angegebenen Kontext. Ungültige Eingaben
 * ergeben ein leeres Dokument.
 */
export function sanitizeDocument(
  input: unknown,
  context: ContentContext,
): TiptapDoc {
  if (!isTiptapDoc(input)) return emptyDoc();
  const allowed = allowedNodesFor(context);
  const content = input.content
    .map((node) => sanitizeNode(node, allowed))
    .filter((n): n is TiptapNode => n !== null);
  return { type: "doc", content };
}

/** Serialisiert ein bereinigtes Dokument als JSON-String für die DB. */
export function serializeDocument(input: unknown, context: ContentContext): string {
  return JSON.stringify(sanitizeDocument(input, context));
}
