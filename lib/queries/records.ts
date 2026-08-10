import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { pickTranslation } from "@/lib/content/pick";
import { assetUrl } from "@/lib/media/url";
import type { Locale } from "@/lib/i18n/config";
import type { PublicationType } from "@/lib/domain";

export interface PublicationItem {
  id: string;
  type: PublicationType;
  year: number;
  isbn: string | null;
  publisher: string | null;
  url: string | null;
  title: string;
  role: string | null;
  coverUrl: string | null;
  coverAlt: string;
  coverAi: boolean;
}

async function loadPublications(locale: Locale): Promise<PublicationItem[]> {
  const pubs = await db.publication.findMany({
    orderBy: [{ year: "desc" }, { sortOrder: "asc" }],
    include: { translations: true, coverAsset: true },
  });
  return pubs.map((p) => {
    const picked = pickTranslation(p.translations, locale);
    const title = picked?.translation.title ?? "";
    return {
      id: p.id,
      type: p.type as PublicationType,
      year: p.year,
      isbn: p.isbn,
      publisher: p.publisher,
      url: p.url,
      title,
      role: picked?.translation.role ?? null,
      coverUrl: p.coverAsset ? assetUrl(p.coverAsset.blobPath) : null,
      coverAlt:
        p.coverAsset && !p.coverAsset.decorative
          ? locale === "en" && p.coverAsset.altEn
            ? p.coverAsset.altEn
            : p.coverAsset.altDe
          : title,
      coverAi: p.coverAsset?.source === "AI",
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
}

async function loadFocusTopics(locale: Locale): Promise<FocusTopicItem[]> {
  const rows = await db.focusTopic.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map((t) => ({
    id: t.id,
    title: locale === "en" && t.titleEn ? t.titleEn : t.titleDe,
    note: t.note,
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
