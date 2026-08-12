import { locales, defaultLocale } from "@/lib/i18n/config";

// Reine Routing-Entscheidungen für die Middleware (`proxy.ts`). Ausgelagert und
// testbar, weil ein Fehler hier (siehe /admin-Regression) den ganzen Bereich
// unerreichbar macht.

/**
 * Pfade, die NICHT lokalisiert werden dürfen: Admin, API, Vorschau, Medien,
 * Next-Interna und alle Dateien mit Endung (robots.txt, sitemap.xml, feeds,
 * llms.txt, Bilder …). Wichtig: `(\/|$)` erfasst auch die exakten Wurzeln —
 * `/admin` (ohne Slash) muss ausgeschlossen sein, sonst leitet die Middleware
 * es fälschlich auf `/de/admin` um (404).
 */
export function isNonLocalizedPath(pathname: string): boolean {
  return /^\/(api|admin|_next|preview|media)(\/|$)/.test(pathname) || /\.[a-zA-Z0-9]+$/.test(pathname);
}

/** true, wenn der Pfad bereits ein Locale-Präfix trägt (`/de`, `/en/…`). */
export function hasLocalePrefix(pathname: string): boolean {
  return locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
}

/** Ziel-Locale aus dem Accept-Language-Header (Fallback: Standardsprache). */
export function pickLocaleFrom(acceptLanguage: string | null | undefined): string {
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(",")
      .map((part) => part.split(";")[0]?.trim().slice(0, 2).toLowerCase())
      .find((code) => code && (locales as readonly string[]).includes(code));
    if (preferred) return preferred;
  }
  return defaultLocale;
}

/**
 * Alt-URL `/(de|en)/(signale|dossiers)[/...]` → Depeschen-Ziel (Phase 3.2, 301).
 * Slugs bleiben identisch; die Dossier-Übersicht bekommt den REFERENCE-Filter.
 * Gibt `null` zurück, wenn es keine Alt-URL ist.
 */
export function legacyDispatchTarget(pathname: string): { path: string; search: string } | null {
  const m = pathname.match(/^\/(de|en)\/(signale|dossiers)(\/.*)?$/);
  if (!m) return null;
  const [, locale, area, rest] = m;
  if (rest && rest !== "/") return { path: `/${locale}/depeschen${rest}`, search: "" };
  return { path: `/${locale}/depeschen`, search: area === "dossiers" ? "?format=REFERENCE" : "" };
}
