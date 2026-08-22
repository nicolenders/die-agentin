import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { pickTranslation } from "@/lib/content/pick";
import { assetUrl } from "@/lib/media/url";
import type { Locale } from "@/lib/i18n/config";
import type { PublicationType } from "@/lib/domain";
import { extractYouTubeId } from "@/lib/video/youtube";

export interface PublicationItem {
  id: string;
  type: PublicationType;
  year: number;
  isbn: string | null;
  publisher: string | null;
  url: string | null;
  repoUrl: string | null;
  language: string | null;
  title: string;
  role: string | null;
  description: string | null;
  coverUrl: string | null;
  coverAlt: string;
  coverAi: boolean;
  /**
   * Nur bei `type = "VIDEO"`: die YouTube-Kennung, aus `url` gelesen. Steht
   * hier `null`, taugt die Adresse nicht — dann erscheint das Video nicht.
   */
  videoId?: string | null;
  // Verkaufte Exemplare (Summe über alle Halbjahre): gedruckt = printed + bundle,
  // PDF = pdf + bundle. null, wenn noch keine Zahlen gepflegt sind.
  salesPrinted?: number | null;
  salesPdf?: number | null;
}

async function loadPublications(locale: Locale): Promise<PublicationItem[]> {
  const pubs = await db.publication.findMany({
    orderBy: [{ year: "desc" }, { sortOrder: "asc" }],
    include: { translations: true, coverAsset: true, sales: true },
  });
  return pubs.map((p) => {
    const picked = pickTranslation(p.translations, locale);
    const title = picked?.translation.title ?? "";
    const hasSales = p.sales.length > 0;
    return {
      id: p.id,
      type: p.type as PublicationType,
      videoId: p.type === "VIDEO" ? extractYouTubeId(p.url) : null,
      year: p.year,
      isbn: p.isbn,
      publisher: p.publisher,
      url: p.url,
      repoUrl: p.repoUrl,
      language: p.language,
      title,
      role: picked?.translation.role ?? null,
      description: picked?.translation.description ?? null,
      coverUrl: p.coverAsset ? assetUrl(p.coverAsset.blobPath) : null,
      coverAlt:
        p.coverAsset && !p.coverAsset.decorative
          ? locale === "en" && p.coverAsset.altEn
            ? p.coverAsset.altEn
            : p.coverAsset.altDe
          : title,
      coverAi: p.coverAsset?.source === "AI",
      salesPrinted: hasSales ? p.sales.reduce((s, x) => s + x.printedCount + x.bundleCount, 0) : null,
      salesPdf: hasSales ? p.sales.reduce((s, x) => s + x.pdfCount + x.bundleCount, 0) : null,
    };
  });
}

export async function getPublications(locale: Locale): Promise<PublicationItem[]> {
  const run = cachedQuery(loadPublications, ["pubs", locale], [tags.publicationList(locale)]);
  try {
    return await run(locale);
  } catch {
    return [];
  }
}

export interface CertificationRecord {
  id: string;
  name: string;
  shortCode: string | null;
  kind: string; // CERTIFICATION | MVP | TRAINING | AWARD
  family: string; // MICROSOFT | METHODICAL (nur bei kind=CERTIFICATION relevant)
  status: string; // PLANNED | ACHIEVED | EXPIRED (Phase 5.3)
  plannedFor: string | null;
  acquiredOn: Date;
  validUntil: Date | null;
  proofUrl: string | null;
  series: string | null;
  logoUrl: string | null;
  logoAlt: string;
  logoAi: boolean;
}

async function loadCertifications(locale: Locale): Promise<CertificationRecord[]> {
  // Reihenfolge im Admin einstellbar: sortOrder gewinnt, acquiredOn nur als
  // Tiebreaker (neueste zuerst), solange nichts manuell sortiert wurde.
  const rows = await db.certification.findMany({
    orderBy: [{ sortOrder: "asc" }, { acquiredOn: "desc" }],
    include: { logo: true },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    shortCode: c.shortCode,
    kind: c.kind,
    family: c.family,
    status: c.status,
    plannedFor: c.plannedFor,
    acquiredOn: c.acquiredOn,
    validUntil: c.validUntil,
    proofUrl: c.proofUrl,
    series: c.series,
    logoAi: c.logo?.source === "AI",
    logoUrl: c.logo ? assetUrl(c.logo.blobPath) : null,
    logoAlt:
      c.logo && !c.logo.decorative
        ? locale === "en" && c.logo.altEn
          ? c.logo.altEn
          : c.logo.altDe
        : c.name,
  }));
}

export async function getCertifications(locale: Locale): Promise<CertificationRecord[]> {
  const run = cachedQuery(loadCertifications, ["certs", locale], [tags.certificationList(locale)]);
  try {
    return await run(locale);
  } catch {
    return [];
  }
}

// --------------------------------------------------- Aktuelle Lernthemen

export const FOCUS_TAG = "focus-topics";

export interface FocusTopicItem {
  id: string;
  title: string;
  note: string | null;
  /** Veröffentlichte Depeschen zu diesem Thema — 0 heißt: nicht anklickbar. */
  dispatchCount: number;
}

// Nur veröffentlichte, tatsächlich sichtbare Depeschen zählen — ein Radar-Punkt
// darf nicht auf eine leere Liste führen.
const PUBLISHED_DISPATCH = { status: "PUBLISHED", translations: { some: { state: "REVIEWED" } } } as const;

async function loadFocusTopics(locale: Locale): Promise<FocusTopicItem[]> {
  const rows = await db.focusTopic.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { dispatches: { where: PUBLISHED_DISPATCH } } } },
  });
  return rows.map((t) => ({
    id: t.id,
    title: locale === "en" && t.titleEn ? t.titleEn : t.titleDe,
    note: t.note,
    dispatchCount: t._count.dispatches,
  }));
}

export async function getFocusTopics(locale: Locale): Promise<FocusTopicItem[]> {
  const run = cachedQuery(loadFocusTopics, ["focus", locale], [FOCUS_TAG]);
  try {
    return await run(locale);
  } catch {
    return [];
  }
}

// Radar-Themen für die Legende: aktive Themen mit optionaler Identitätsfarbe
// (falls einer veröffentlichten Identität zugeordnet). Farbe = erste zugeordnete
// veröffentlichte Identität.
export interface RadarTopicItem {
  id: string;
  title: string;
  note: string | null;
  color: string | null;
  /** Veröffentlichte Depeschen zu diesem Thema — 0 heißt: nicht anklickbar. */
  dispatchCount: number;
}

async function loadRadarTopics(locale: Locale): Promise<RadarTopicItem[]> {
  const rows = await db.focusTopic.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      identities: { where: { published: true }, select: { color: true }, orderBy: { sortOrder: "asc" } },
      _count: { select: { dispatches: { where: PUBLISHED_DISPATCH } } },
    },
  });
  return rows.map((t) => ({
    id: t.id,
    title: locale === "en" && t.titleEn ? t.titleEn : t.titleDe,
    note: t.note,
    color: t.identities[0]?.color ?? null,
    dispatchCount: t._count.dispatches,
  }));
}

export async function getRadarTopics(locale: Locale): Promise<RadarTopicItem[]> {
  const run = cachedQuery(loadRadarTopics, ["radar", locale], [FOCUS_TAG, tags.identityList(locale)]);
  try {
    return await run(locale);
  } catch {
    return [];
  }
}
