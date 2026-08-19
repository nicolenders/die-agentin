import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

// Alt-URLs des WordPress-Blogs (docs/CUTOVER.md §14.2).
//
// Die Domain war jahrelang „Nicole's Microsoft 365 & Azure Playground" auf
// WordPress.com. Deren URLs stehen weiter im Index von Google & Co. und tragen
// die Backlinks. Ohne diese Tabelle laufen sie ins Leere: `/blog/` wurde vom
// Trailing-Slash-Handling auf `/blog` normalisiert, von der Sprachweiche auf
// `/de/blog` geschoben und endete dort als 404 — drei Sprünge, am Ende nichts.
//
// Regeln:
//   * Ein Ziel, das den Inhalt fortführt → 301 (der Rang wandert mit).
//   * Kein sinnvolles Ziel, aber der Pfad war öffentlich → 301 auf die nächste
//     passende Übersicht, nicht auf die Startseite (sonst wertet Google es als
//     Soft-404).
//   * Technische WordPress-Pfade, die es nie wieder geben wird → 410 Gone.
//     Das ist die klare Ansage „weg, hör auf zu fragen"; ein 404 lädt zum
//     Wiederkommen ein und hält die URL länger im Index.
//
// Die Tabelle ist bewusst Code und keine CSV: sie ist getestet, versioniert und
// gilt in genau einer Reihenfolge. `data/redirects.csv` bleibt die Arbeitsliste
// für Nicoles Freigabe (Phase 14.2); bestätigte Zeilen wandern hierher.

export interface LegacyResolution {
  /** Zielpfad inklusive Sprachpräfix. Fehlt bei `gone`. */
  path?: string;
  /** 301 = dauerhaft umgezogen, 410 = endgültig weg. */
  status: 301 | 410;
}

/** Pfad ohne Query, ohne Trailing Slash, klein geschrieben. */
function normalize(pathname: string): string {
  const lower = pathname.toLowerCase();
  const trimmed = lower.length > 1 ? lower.replace(/\/+$/, "") : lower;
  return trimmed || "/";
}

/**
 * Sprache eines Alt-Pfades. Der WordPress-Blog war einsprachig und hatte kein
 * Präfix; wer aus dem Index kommt, landet deshalb auf der Standardsprache.
 * Trug der Alt-Pfad doch schon ein Präfix (Umzug innerhalb der neuen Seite),
 * bleibt es erhalten.
 */
function localeOf(segments: string[]): { locale: Locale; rest: string[] } {
  const head = segments[0];
  if (head && (locales as readonly string[]).includes(head)) {
    return { locale: head as Locale, rest: segments.slice(1) };
  }
  return { locale: defaultLocale, rest: segments };
}

/** Feste Eins-zu-eins-Zuordnungen (ohne Sprachpräfix, ohne Trailing Slash). */
const EXACT: Record<string, string> = {
  "/about-me": "legende",
  "/about": "legende",
  "/kontakt": "legende",
  "/contact": "legende",
  "/blog": "depeschen",
  "/speaking": "einsaetze",
  "/talks": "einsaetze",
  "/vortraege": "einsaetze",
  "/books": "publikationen",
  "/buecher": "publikationen",
};

/**
 * Technische WordPress-Pfade. Sie haben in der neuen Seite kein Gegenstück und
 * bekommen deshalb 410 statt eines Redirects, der nur so tut als ob.
 */
const GONE_PREFIXES = [
  "/wp-content",
  "/wp-includes",
  "/wp-admin",
  "/wp-json",
  "/xmlrpc.php",
  "/wp-login.php",
  "/wp-cron.php",
  "/wp-signup.php",
  "/trackback",
];

/** Übersichten, deren Alt-Pfad auf die Depeschenliste führt. */
const LIST_PREFIXES = ["tag", "category", "kategorie", "archives", "archiv", "page"];

/** WordPress-Permalink `/2021/05/12/slug` bzw. `/2021/05/slug`. */
function datedPermalinkSlug(rest: string[]): string | null {
  const [year, month, ...tail] = rest;
  if (!year || !/^(19|20)\d{2}$/.test(year)) return null;
  if (!month || !/^\d{1,2}$/.test(month)) return null;
  // Tagessegment ist optional — beide Permalink-Varianten kommen vor.
  const withoutDay = tail[0] && /^\d{1,2}$/.test(tail[0]) ? tail.slice(1) : tail;
  const slug = withoutDay[0];
  return slug && slug.length > 0 ? slug : null;
}

/**
 * Ziel für eine Alt-URL, oder `null`, wenn der Pfad nichts mit dem Altbestand
 * zu tun hat (dann geht die normale Verarbeitung weiter).
 *
 * Feeds sind ausgenommen: `/feed` wird auf den neuen RSS-Pfad geführt, der kein
 * Sprachpräfix trägt.
 */
export function legacyTarget(pathname: string): LegacyResolution | null {
  const path = normalize(pathname);

  for (const prefix of GONE_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return { status: 410 };
    }
  }

  // WordPress-Feeds → der neue Feed. Ohne Sprachpräfix, deshalb vor localeOf.
  if (path === "/feed" || path.endsWith("/feed") || path === "/comments/feed") {
    return { path: "/feed.xml", status: 301 };
  }
  // WordPress-Sitemaps → die neue Sitemap.
  if (path === "/wp-sitemap.xml" || /^\/wp-sitemap.*\.xml$/.test(path)) {
    return { path: "/sitemap.xml", status: 301 };
  }

  const segments = path.split("/").filter(Boolean);
  const { locale, rest } = localeOf(segments);
  const bare = `/${rest.join("/")}`;

  const exact = EXACT[bare];
  if (exact) return { path: `/${locale}/${exact}`, status: 301 };

  const head = rest[0];
  if (!head) return null;

  // Autorenarchiv — es gab genau eine Autorin.
  if (head === "author") return { path: `/${locale}/legende`, status: 301 };

  if (LIST_PREFIXES.includes(head)) {
    return { path: `/${locale}/depeschen`, status: 301 };
  }

  const slug = datedPermalinkSlug(rest);
  if (slug) return { path: `/${locale}/depeschen/${slug}`, status: 301 };

  return null;
}
