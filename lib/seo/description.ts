// Meta-Beschreibungen für Detailseiten (Audit 1.2).
//
// Übersichtsseiten bekommen ihre Description als gepflegten Text aus dem
// Wörterbuch (`dict.meta.*`). Detailseiten können das nicht — dort wird sie aus
// den Entitätsdaten gebaut. Diese Datei hält die dafür nötige Kürzung an einer
// Stelle, damit keine Seite einen abgeschnittenen Halbsatz ausliefert.

/** Obergrenze, ab der Google die Description in der Ergebnisliste kappt. */
export const META_DESCRIPTION_MAX = 155;

/**
 * Erster Satz eines Textes. Endet der Text vorher, kommt er ganz zurück.
 *
 * Ein Satzende ist ein `.`/`!`/`?`, dem mindestens zwei Zeichen ohne Leerraum
 * und ohne Punkt vorausgehen und auf das Textende oder ein Großbuchstabe folgt.
 * Damit beenden Abkürzungen wie „z. B." den Satz nicht — dort steht vor dem
 * Punkt nur ein einzelner Buchstabe.
 */
export function firstSentence(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const match = /(?<=[^\s.][^\s.])[.!?](?=\s+["„«(]?[A-ZÄÖÜ]|\s*$)/.exec(clean);
  return match ? clean.slice(0, match.index + 1) : clean;
}

/**
 * Kürzt auf `max` Zeichen an der letzten Wortgrenze und hängt eine Ellipse an.
 * Kürzer als `max` bleibt unverändert — keine Ellipse ohne abgeschnittenen Text.
 */
export function truncateAtWord(text: string, max = META_DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const head = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${head.replace(/[\s,;:.!?–-]+$/, "")}…`;
}

/**
 * Setzt eine Description aus Bausteinen zusammen (leere werden übersprungen)
 * und kürzt auf 155 Zeichen. Gibt `undefined` zurück, wenn nichts übrig bleibt
 * — dann erbt die Seite die Description des Layouts, statt eine leere zu setzen.
 */
export function metaDescription(...parts: (string | null | undefined)[]): string | undefined {
  const joined = parts
    .map((p) => (p ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
  if (!joined) return undefined;
  return truncateAtWord(joined);
}
