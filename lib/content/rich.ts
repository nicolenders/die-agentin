import { sanitizeDocument } from "./sanitize";
import { emptyDoc, isTiptapDoc, type TiptapDoc, type TiptapNode } from "./schema";

// Adapter für formularbasierte Rich-Text-Felder. Neue Werte werden als
// TipTap-JSON gespeichert; ältere (Plain-Text-)Werte werden beim Lesen als
// Absätze verpackt. Dadurch braucht die Umstellung bestehender Felder auf
// Rich-Text KEINE Datenmigration.

function plainToDoc(text: string): TiptapDoc {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.trim()) return emptyDoc();
  const paragraphs = normalized.split(/\n{2,}/);
  return {
    type: "doc",
    content: paragraphs
      .map((para) => para.trim())
      .filter(Boolean)
      .map((para) => {
        const lines = para.split("\n");
        const content: TiptapNode[] = [];
        lines.forEach((line, i) => {
          if (i > 0) content.push({ type: "hardBreak" });
          if (line) content.push({ type: "text", text: line });
        });
        return { type: "paragraph", content };
      }),
  };
}

/**
 * Liest einen gespeicherten Feldwert als bereinigtes Rich-Text-Dokument.
 * TipTap-JSON wird geparst und bereinigt; alles andere als Plain-Text verpackt.
 */
export function parseRichValue(value: string | null | undefined): TiptapDoc {
  if (!value) return emptyDoc();
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isTiptapDoc(parsed)) return sanitizeDocument(parsed, "field");
    } catch {
      // kein gültiges JSON → als Plain-Text behandeln
    }
  }
  return plainToDoc(value);
}

function blockText(node: TiptapNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return " ";
  return (node.content ?? []).map(blockText).join("");
}

/** Reiner Text eines Feldwerts — für Meta-Beschreibungen, Vorschauen, Suche. */
export function richValueToPlain(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return value.trim();
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isTiptapDoc(parsed)) {
      return parsed.content
        .map(blockText)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }
  } catch {
    // fällt auf den Rohwert zurück
  }
  return value.trim();
}

/** Ob ein Feldwert keinen sichtbaren Text enthält. */
export function isRichEmpty(value: string | null | undefined): boolean {
  return richValueToPlain(value).length === 0;
}

/**
 * Bereinigt und serialisiert einen vom RichTextField gesendeten Wert für die DB.
 * Leere Dokumente werden als leerer String gespeichert (statt „{}"-Rauschen).
 */
export function serializeRichValue(value: string | null | undefined): string {
  if (isRichEmpty(value)) return "";
  return JSON.stringify(parseRichValue(value));
}
