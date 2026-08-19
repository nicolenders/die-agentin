import { locales, type Locale } from "@/lib/i18n/config";

// Alt-URLs des WordPress-Blogs (docs/CUTOVER.md §14.2).
//
// Die Domain war jahrelang „Nicole's Microsoft 365 & Azure Playground" auf
// WordPress.com. Deren URLs stehen weiter im Index von Google & Co. Ohne diese
// Tabelle laufen sie ins Leere: `/blog/` wurde vom Trailing-Slash-Handling auf
// `/blog` normalisiert, von der Sprachweiche auf `/de/blog` geschoben und
// endete dort als 404 — drei Sprünge, am Ende nichts.
//
// AUSGANGSLAGE (Nicoles Entscheidung, 19.08.2026): Der alte Blog ist
// vollständig gelöscht — Seiten, Beiträge, Bilder —, das Abo gekündigt. Es wird
// NICHTS migriert. Die Domain trägt künftig allein die neue Seite.
//
// Das entscheidet die Behandlung der Beiträge. Ein Redirect auf
// `/depeschen/<slug>` wäre ein Versprechen auf einen Inhalt, den es nie geben
// wird: der 301 endete dauerhaft im 404 — für Google dasselbe wie ein 404, nur
// mit einem zusätzlichen Aufruf davor. Und alle Beiträge stattdessen auf die
// Depeschenliste zu bündeln, wäre ein Umzug, der keiner ist; Google wertet
// Weiterleitungen auf einen erkennbar anderen Inhalt als Soft-404.
//
// Also die ehrliche Antwort: 410. Sie sagt „gelöscht, endgültig" und ist genau
// das Werkzeug, das die veralteten Einträge am schnellsten aus dem Index nimmt
// — das erklärte Ziel bei diesem Domainwechsel.
//
// Regeln:
//   * Eine Seite, deren FUNKTION fortbesteht → 301. Das gilt für die
//     Übersichten: `/blog/`, `/tag/…`, `/category/…` und `/page/N` waren
//     Listen ihrer Beiträge, `/depeschen` ist die Liste ihrer Beiträge.
//     `/about-me/` war die Über-mich-Seite, `/legende` ist sie. `/feed/` war
//     der Feed, `/feed.xml` ist er. Das sind echte Entsprechungen, keine
//     Notlösungen.
//   * Ein gelöschter EINZELBEITRAG → 410. Für ihn gibt es keine Entsprechung,
//     nur eine Liste — und eine Liste ist kein Artikel.
//   * Technische WordPress-Pfade, die es nie wieder geben wird → 410 Gone.
//   * Das Ziel trägt KEIN Sprachpräfix, wenn die Alt-URL keines trug. Der alte
//     Blog war englischsprachig („Use Cases for private channels in Microsoft
//     Teams", „Org-wide teams and their purpose"; Deutsch war die Ausnahme und
//     eigens als `/tag/deutsch/` ausgezeichnet). Ein hart auf `/de/…` gesetztes
//     Ziel schickte dieses Publikum auf deutsche Seiten. Stattdessen führt der
//     301 auf den sprachlosen Pfad, und die vorhandene Sprachweiche verhandelt
//     wie bei jeder anderen sprachlosen Adresse — auch bei `/` selbst. Der 301
//     bleibt damit sprachunabhängig und cachebar; die sprachabhängige
//     Entscheidung steckt im temporären 307 dahinter, wo sie hingehört.
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
 * Sprachpräfix des Alt-Pfades, falls vorhanden. `null` heißt: die Alt-URL trug
 * keines — dann trägt das Ziel auch keines und die Sprachweiche entscheidet.
 */
function localeOf(segments: string[]): { locale: Locale | null; rest: string[] } {
  const head = segments[0];
  if (head && (locales as readonly string[]).includes(head)) {
    return { locale: head as Locale, rest: segments.slice(1) };
  }
  return { locale: null, rest: segments };
}

/** Zielpfad bauen — mit Sprachpräfix nur, wenn die Quelle eines trug. */
function to(locale: Locale | null, segment: string): string {
  return locale ? `/${locale}/${segment}` : `/${segment}`;
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

/**
 * Datumsbasierte WordPress-Adressen. Zwei Sorten, die verschieden behandelt
 * werden müssen:
 *
 *   "beitrag"  `/2021/05/12/slug`, `/2021/05/slug`, auch mit angehängter
 *              Kommentarseite (`…/slug/comment-page-2/`) → gelöschter Artikel.
 *   "archiv"   `/2021/`, `/2021/05/`, `/2021/05/12/` → war eine Übersicht,
 *              und eine Übersicht gibt es weiterhin.
 *
 * `null` heißt: hat mit Datumsadressen nichts zu tun.
 */
function datedKind(rest: string[]): "beitrag" | "archiv" | null {
  const [year, month, ...tail] = rest;
  if (!year || !/^(19|20)\d{2}$/.test(year)) return null;
  if (!month) return "archiv"; // reines Jahresarchiv
  if (!/^\d{1,2}$/.test(month)) return null;
  // Tagessegment ist optional — beide Permalink-Varianten kommen vor.
  const withoutDay = tail[0] && /^\d{1,2}$/.test(tail[0]) ? tail.slice(1) : tail;
  return (withoutDay[0]?.length ?? 0) > 0 ? "beitrag" : "archiv";
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
  if (exact) return { path: to(locale, exact), status: 301 };

  const head = rest[0];
  if (!head) return null;

  // Autorenarchiv — es gab genau eine Autorin.
  if (head === "author") return { path: to(locale, "legende"), status: 301 };

  if (LIST_PREFIXES.includes(head)) {
    return { path: to(locale, "depeschen"), status: 301 };
  }

  // Datumsadressen: der gelöschte Beitrag bekommt die Wahrheit, das Archiv
  // die Liste, die seine Aufgabe übernommen hat.
  const dated = datedKind(rest);
  if (dated === "beitrag") return { status: 410 };
  if (dated === "archiv") return { path: to(locale, "depeschen"), status: 301 };

  return null;
}
