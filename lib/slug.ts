// Erzeugt einen URL-tauglichen Slug aus einem Titel. Deutsche Umlaute werden
// transliteriert, damit Slugs stabil und lesbar bleiben.
const MAP: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
  Ä: "ae",
  Ö: "oe",
  Ü: "ue",
};

// Exotische Bindestriche auf den normalen ASCII-Bindestrich abbilden (Audit
// 4.2). Ohne das erzeugen „Team‑Power" (U+2011, geschützter Bindestrich) und
// „Team-Power" (U+002D) zwei verschiedene Slugs — genau so ist im Repertoire
// eine Dublette entstanden. Abgedeckt: U+2010 bis U+2015 (Hyphen, Non-Breaking
// Hyphen, Figure Dash, En Dash, Em Dash, Horizontal Bar) und U+2212 (Minus).
const HYPHENS = /[‐-―−]/g;

/** Vereinheitlicht alle Bindestrich-Varianten zu `-`. Auch für Titelvergleiche. */
export function normalizeHyphens(input: string): string {
  return input.replace(HYPHENS, "-");
}

export function slugify(input: string): string {
  return normalizeHyphens(input)
    .trim()
    .replace(/[äöüßÄÖÜ]/g, (c) => MAP[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // Diakritika entfernen
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
