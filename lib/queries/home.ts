import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { assetUrl } from "@/lib/media/url";
import { pickHomeFocusText } from "@/lib/home-focus";
import { getDictionary } from "@/lib/i18n";
import { countVisitedCountries } from "@/lib/missions";
import type { Locale } from "@/lib/i18n/config";

// Startseiten-Hero (SPEC §5). Im Admin pflegbar (Model HomeContent), mit Rückfall
// auf die i18n-Standardtexte, solange nichts gepflegt ist. Gecacht über den Tag
// `home`, damit ein Seitenaufruf die DB nicht berührt.

export const HOME_TAG = "home";

export interface HeroImage {
  url: string;
  alt: string;
  ai: boolean;
}

export interface HeroData {
  eyebrow: string;
  headlineValue: string; // Rich-Text-Feldwert (TipTap-JSON)
  leadValue: string; // Rich-Text-Feldwert oder Plain-Text
  roles: string[];
  heroImage: HeroImage | null;
}

// Standard-Headline aus den i18n-Teilen, mit Akzent auf dem Highlight-Wort.
function defaultHeadlineDoc(line1: string, prefix: string, highlight: string): string {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: line1 },
          { type: "hardBreak" },
          ...(prefix ? [{ type: "text", text: prefix }] : []),
          { type: "text", text: highlight, marks: [{ type: "highlight" }] },
          { type: "text", text: "." },
        ],
      },
    ],
  });
}

export function parseRoles(value: string | null | undefined): string[] | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const roles = parsed.map((r) => String(r).trim()).filter(Boolean);
      return roles.length > 0 ? roles : null;
    }
  } catch {
    // ignorieren → Standard greift
  }
  return null;
}

function fetchHome(locale: Locale) {
  return db.homeContent.findUnique({ where: { locale }, include: { heroAsset: true } });
}

export async function getHomeHero(locale: Locale): Promise<HeroData> {
  const dict = await getDictionary(locale);
  const t = dict.hq;

  let row: Awaited<ReturnType<typeof fetchHome>> = null;
  try {
    const run = cachedQuery(fetchHome, ["home-content", locale], [HOME_TAG]);
    row = await run(locale);
  } catch {
    row = null;
  }

  return {
    eyebrow: row?.eyebrow?.trim() || t.eyebrow,
    headlineValue:
      row?.headline?.trim() ||
      defaultHeadlineDoc(t.titleLine1, t.titleLine2Prefix, t.titleHighlight),
    leadValue: row?.lead?.trim() || t.lead,
    roles: parseRoles(row?.roles) ?? [...t.roles],
    heroImage: row?.heroAsset
      ? {
          url: assetUrl(row.heroAsset.blobPath),
          alt:
            locale === "en" && row.heroAsset.altEn
              ? row.heroAsset.altEn
              : row.heroAsset.altDe,
          ai: row.heroAsset.source === "AI",
        }
      : null,
  };
}

/** Rohdaten für das Admin-Formular (kein Fallback, damit Leerfelder leer sind). */
export async function getHomeContentRaw(locale: Locale) {
  try {
    return await fetchHome(locale);
  } catch {
    return null;
  }
}

// --------------------------------------------------------------- Kennzahlen

export interface HomeStats {
  missions: number;
  countries: number;
  briefings: number;
  books: number;
  mvpAwards: number; // Anzahl der MVP-Auszeichnungen aus „Ausbildung"
  certifications: number; // Anzahl der Zertifizierungen (kind=CERTIFICATION)
  identities: number; // veröffentlichte Identitäten (Phase 10.4)
  // Verkaufte Exemplare gesamt über alle Bücher: die öffentlich gezeigten Summen
  // „gedruckt" (gedruckt + Bundle) plus „PDF" (PDF + Bundle) — Bundles zählen also
  // in beiden Formaten, so wie sie auf den Buch-Karten ausgewiesen sind.
  copiesSold: number;
}

// MVP-Auszeichnungen werden unter „Ausbildung" (Zertifizierungen) als Reihe bzw.
// Kategorie „MVP" gepflegt. Der Zähler summiert alle solchen Einträge — je ein
// Eintrag pro Jahr ergibt so automatisch die Zahl (statt einer festen 7).
async function loadHomeStats(): Promise<HomeStats> {
  const [missions, countryRows, briefings, books, mvpAwards, certifications, identities, salesAgg] =
    await Promise.all([
      db.mission.count(),
      db.mission.findMany({ select: { countryCode: true, isOnline: true } }),
      db.talk.count({ where: { active: true } }),
      db.publication.count({ where: { type: "BOOK" } }),
      db.certification.count({ where: { kind: "MVP" } }),
      db.certification.count({ where: { kind: "CERTIFICATION" } }),
      db.identity.count({ where: { published: true } }),
      db.publicationSales.aggregate({
        _sum: { printedCount: true, pdfCount: true, bundleCount: true },
      }),
    ]);
  // „gedruckt" = printedCount + bundleCount, „PDF" = pdfCount + bundleCount → Summe
  // beider = printedCount + pdfCount + 2×bundleCount.
  const copiesSold =
    (salesAgg._sum.printedCount ?? 0) +
    (salesAgg._sum.pdfCount ?? 0) +
    2 * (salesAgg._sum.bundleCount ?? 0);
  return {
    missions,
    countries: countVisitedCountries(countryRows),
    briefings,
    books,
    mvpAwards,
    certifications,
    identities,
    copiesSold,
  };
}

// Kennzahlen der Startseite. Getaggt mit allen relevanten Listen, damit ein
// Veröffentlichen (Einsatz/Beitrag/Briefing/Publikation/Zertifizierung) die
// Zähler auffrischt.
export async function getHomeStats(): Promise<HomeStats> {
  const run = cachedQuery(loadHomeStats, ["home-stats"], [
    HOME_TAG,
    tags.missionList("de"),
    tags.postList("de"),
    tags.briefingList("de"),
    tags.publicationList("de"),
    tags.certificationList("de"),
    tags.identityList("de"),
  ]);
  try {
    return await run();
  } catch {
    return { missions: 0, countries: 0, briefings: 0, books: 0, mvpAwards: 0, certifications: 0, identities: 0, copiesSold: 0 };
  }
}

// ------------------------------------------------ Woran ich gerade arbeite

export const HOME_FOCUS_TAG = "home-focus";

export interface HomeFocusItem {
  id: string;
  title: string;
  text: string;
  iconUrl: string | null;
  iconAlt: string;
  iconAi: boolean;
}

async function loadHomeFocus(locale: Locale): Promise<HomeFocusItem[]> {
  const rows = await db.homeFocus.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { icon: true },
  });
  return rows.map((row) => {
    const { title, text } = pickHomeFocusText(row, locale);
    return {
      id: row.id,
      title,
      text,
      iconUrl: row.icon ? assetUrl(row.icon.blobPath) : null,
      // Ein Logo ohne eigenen Alt-Text beschreibt sich über den Titel daneben.
      iconAlt:
        row.icon && !row.icon.decorative
          ? (locale === "en" && row.icon.altEn ? row.icon.altEn : row.icon.altDe) || title
          : "",
      iconAi: row.icon?.source === "AI",
    };
  });
}

/**
 * Die kuratierten Werkzeuge und Themen der Startseite. Fällt die Datenbank aus,
 * bleibt der Block einfach leer, statt die Startseite scheitern zu lassen.
 */
export async function getHomeFocus(locale: Locale): Promise<HomeFocusItem[]> {
  const run = cachedQuery(loadHomeFocus, ["home-focus", locale], [HOME_FOCUS_TAG]);
  try {
    return await run(locale);
  } catch {
    return [];
  }
}

/** Rohdaten für die Redaktion, inklusive der ausgeblendeten Einträge. */
export async function getHomeFocusRaw() {
  try {
    return await db.homeFocus.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { icon: true },
    });
  } catch {
    return [];
  }
}
