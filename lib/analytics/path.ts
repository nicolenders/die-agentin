// Reine Pfad-Normalisierung für die Reichweiten-Erfassung — ohne Server- oder
// DB-Abhängigkeiten, damit sie isoliert testbar bleibt.

const LOCALES = new Set(["de", "en"]);
// Bereiche, die nicht zur öffentlichen Reichweite zählen.
const NON_PUBLIC = new Set(["api", "admin", "preview", "media", "_next"]);

export interface NormalizedPath {
  path: string; // Pfad ohne Sprach-Präfix, ohne Query/Hash („/" für die Startseite)
  locale: string; // "de" | "en"
  section: string; // grobe Rubrik (erstes Segment) bzw. "home"
}

/**
 * Normalisiert einen öffentlichen Pfad: Query/Hash entfernen, Sprach-Präfix
 * abtrennen. Liefert `null` für nicht-öffentliche Bereiche (Admin, API …).
 */
export function normalizePath(rawPath: string): NormalizedPath | null {
  const noHash = rawPath.split("#")[0] ?? "";
  const noQuery = noHash.split("?")[0] ?? "";
  const withSlash = noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
  const segs = withSlash.split("/").filter(Boolean);
  const hasLocale = segs.length > 0 && LOCALES.has(segs[0] ?? "");
  const locale = hasLocale ? (segs[0] as string) : "de";
  const rest = hasLocale ? segs.slice(1) : segs;
  const first = rest[0] ?? "";
  if (NON_PUBLIC.has(first)) return null;
  const path = rest.length === 0 ? "/" : `/${rest.join("/")}`;
  const section = rest.length === 0 ? "home" : (rest[0] as string);
  return { path: path.slice(0, 512), locale, section: section.slice(0, 64) };
}
