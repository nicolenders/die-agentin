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

export function slugify(input: string): string {
  return input
    .trim()
    .replace(/[äöüßÄÖÜ]/g, (c) => MAP[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // Diakritika entfernen
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
