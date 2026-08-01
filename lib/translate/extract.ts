import type { TiptapDoc, TiptapNode } from "@/lib/content/schema";

// Blockweise Übersetzung (SPEC §8): Text wird aus dem TipTap-Dokument extrahiert,
// übersetzt und in ein strukturgleiches Dokument zurückgeschrieben. Die
// Reihenfolge der Text-Knoten ist stabil, daher genügt ein Index-Abgleich.

/** Sammelt alle Text-Inhalte in Dokument-Reihenfolge. */
export function extractTexts(doc: TiptapDoc): string[] {
  const out: string[] = [];
  function visit(node: TiptapNode): void {
    if (node.type === "text" && typeof node.text === "string") {
      out.push(node.text);
    }
    node.content?.forEach(visit);
  }
  doc.content.forEach(visit);
  return out;
}

/**
 * Schreibt übersetzte Texte in ein strukturgleiches Dokument zurück. Fehlt eine
 * Übersetzung an einer Position, bleibt der Originaltext erhalten.
 */
export function applyTexts(doc: TiptapDoc, translated: string[]): TiptapDoc {
  let index = 0;
  function visit(node: TiptapNode): TiptapNode {
    if (node.type === "text" && typeof node.text === "string") {
      const next = translated[index] ?? node.text;
      index += 1;
      return { ...node, text: next };
    }
    if (node.content) {
      return { ...node, content: node.content.map(visit) };
    }
    return node;
  }
  return { type: "doc", content: doc.content.map(visit) };
}
