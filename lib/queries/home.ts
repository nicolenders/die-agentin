import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { assetUrl } from "@/lib/media/url";
import { getDictionary } from "@/lib/i18n";
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
}

// MVP-Auszeichnungen werden unter „Ausbildung" (Zertifizierungen) als Reihe bzw.
// Kategorie „MVP" gepflegt. Der Zähler summiert alle solchen Einträge — je ein
// Eintrag pro Jahr ergibt so automatisch die Zahl (statt einer festen 7).
async function loadHomeStats(): Promise<HomeStats> {
  const [missions, countryGroups, briefings, books, mvpAwards, certifications] = await Promise.all([
    db.mission.count(),
    db.mission.groupBy({ by: ["countryCode"] }),
    db.talk.count({ where: { active: true } }),
    db.publication.count({ where: { type: "BOOK" } }),
    db.certification.count({ where: { kind: "MVP" } }),
    db.certification.count({ where: { kind: "CERTIFICATION" } }),
  ]);
  return {
    missions,
    countries: countryGroups.length,
    briefings,
    books,
    mvpAwards,
    certifications,
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
  ]);
  try {
    return await run();
  } catch {
    return { missions: 0, countries: 0, briefings: 0, books: 0, mvpAwards: 0, certifications: 0 };
  }
}
