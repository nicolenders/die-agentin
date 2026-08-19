// Prüfungen für den Reichweiten-Beacon (`/api/track`). Ohne Server- oder
// DB-Abhängigkeit, damit sie isoliert prüfbar sind — der Endpunkt selbst
// antwortet immer 204 und kann deshalb nicht sinnvoll von außen getestet werden.

/** Obergrenze eines Pfades. Länger ist kein Seitenaufruf, sondern Müll. */
export const MAX_PATH_LENGTH = 512;

/**
 * Plausibler eigener Pfad?
 *
 * Der Endpunkt nahm vorher jede Zeichenkette entgegen und schrieb sie in die
 * Tabelle — inklusive fremder URLs und beliebiger Zeichen. Erlaubt sind
 * relative Pfade dieser Seite in vernünftiger Länge: kein Protokoll, kein
 * protokollrelativer Fremd-Host, keine Steuer- oder Anführungszeichen.
 */
export function isPlausiblePath(path: string): boolean {
  if (!path.startsWith("/") || path.length > MAX_PATH_LENGTH) return false;
  if (path.startsWith("//")) return false; // protokollrelative Fremd-URL
  // Leerraum, spitze Klammern, Anfuehrungszeichen, Backslash, Steuerzeichen.
  return !/[\s<>"'\\\u0000-\u001f\u007f]/.test(path);
}

/** Pfadanteil eines Referers; leerer String, wenn er nicht taugt. */
export function pathFromReferer(referer: string | null | undefined): string {
  if (!referer) return "";
  try {
    return new URL(referer).pathname;
  } catch {
    return "";
  }
}
