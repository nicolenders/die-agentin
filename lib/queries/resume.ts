import { db } from "@/lib/db";
import { cachedQuery } from "@/lib/cache";
import { assetUrl } from "@/lib/media/url";
import type { Locale } from "@/lib/i18n/config";

// Klassischer Lebenslauf: Kopf/Zusammenfassung (Singleton) + Einträge je Rubrik.
export const RESUME_TAG = "resume";

export interface ResumeEntryData {
  id: string;
  section: string;
  title: string;
  subtitle: string | null;
  location: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  description: string | null;
  tags: string[];
  sortOrder: number;

  // nur PROJECT
  projectFrom: string | null;
  projectTo: string | null;
  personDays: number | null;
  clientAnonymous: boolean;
  clientSector: string | null;

  // nur SKILL
  skillYears: number | null;
  skillLevel: string | null;
}

export interface ResumeProfileData {
  headline: string;
  summary: string;
  location: string;
  /**
   * Das Bewerbungsfoto. `null` heißt: keins gepflegt — der Lebenslauf greift
   * dann auf das Porträt der Legende zurück. Umgekehrt wirkt ein Bild hier
   * NICHT auf die Legende zurück.
   */
  portrait: { url: string; alt: string; ai: boolean } | null;
}

export interface ResumeData {
  profile: ResumeProfileData | null;
  career: ResumeEntryData[];
  education: ResumeEntryData[];
  skills: ResumeEntryData[];
  projects: ResumeEntryData[];
  hasAny: boolean;
}

function parseTags(value: string | null): string[] {
  try {
    const arr = value ? JSON.parse(value) : [];
    return Array.isArray(arr) ? arr.map((x) => String(x)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

type ResumeEntryRow = Omit<ResumeEntryData, "tags"> & { tags: string | null };

function toEntry(e: ResumeEntryRow): ResumeEntryData {
  return {
    id: e.id,
    section: e.section,
    title: e.title,
    subtitle: e.subtitle,
    location: e.location,
    periodFrom: e.periodFrom,
    periodTo: e.periodTo,
    description: e.description,
    tags: parseTags(e.tags),
    sortOrder: e.sortOrder,
    projectFrom: e.projectFrom,
    projectTo: e.projectTo,
    personDays: e.personDays,
    clientAnonymous: e.clientAnonymous,
    clientSector: e.clientSector,
    skillYears: e.skillYears,
    skillLevel: e.skillLevel,
  };
}

async function loadResume(locale: Locale): Promise<ResumeData> {
  const [profile, entries] = await Promise.all([
    db.resumeProfile.findUnique({ where: { id: "default" }, include: { portrait: true } }),
    db.resumeEntry.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  const bySection = (s: string) => entries.filter((e) => e.section === s).map(toEntry);
  const asset = profile?.portrait ?? null;
  const profileData: ResumeProfileData | null = profile
    ? {
        headline: profile.headline,
        summary: profile.summary,
        location: profile.location,
        portrait: asset
          ? {
              url: assetUrl(asset.blobPath),
              alt: asset.decorative
                ? ""
                : (locale === "en" && asset.altEn ? asset.altEn : asset.altDe),
              ai: asset.source === "AI",
            }
          : null,
      }
    : null;
  const hasProfile = Boolean(profileData && (profileData.headline || profileData.summary));
  return {
    profile: profileData,
    career: bySection("CAREER"),
    education: bySection("EDUCATION"),
    skills: bySection("SKILL"),
    projects: bySection("PROJECT"),
    hasAny: hasProfile || entries.length > 0,
  };
}

export async function getResume(locale: Locale = "de"): Promise<ResumeData> {
  const run = cachedQuery(loadResume, ["resume", locale], [RESUME_TAG]);
  try {
    return await run(locale);
  } catch {
    return { profile: null, career: [], education: [], skills: [], projects: [], hasAny: false };
  }
}

/** Rohdaten für den Admin-Editor (ohne Cache). */
export async function getResumeForEdit() {
  try {
    const [profile, entries] = await Promise.all([
      db.resumeProfile.findUnique({ where: { id: "default" }, include: { portrait: true } }),
      db.resumeEntry.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    ]);
    return {
      profile,
      portraitUrl: profile?.portrait ? assetUrl(profile.portrait.blobPath) : null,
      entries,
    };
  } catch {
    return {
      profile: null,
      portraitUrl: null,
      entries: [] as Awaited<ReturnType<typeof db.resumeEntry.findMany>>,
    };
  }
}
