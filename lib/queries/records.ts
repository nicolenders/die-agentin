import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { pickTranslation } from "@/lib/content/pick";
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
}

async function loadPublications(locale: Locale): Promise<PublicationItem[]> {
  const pubs = await db.publication.findMany({
    orderBy: [{ year: "desc" }, { sortOrder: "asc" }],
    include: { translations: true },
  });
  return pubs.map((p) => {
    const picked = pickTranslation(p.translations, locale);
    return {
      id: p.id,
      type: p.type as PublicationType,
      year: p.year,
      isbn: p.isbn,
      publisher: p.publisher,
      url: p.url,
      title: picked?.translation.title ?? "",
      role: picked?.translation.role ?? null,
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

export interface CertificationGroup {
  category: string;
  items: {
    id: string;
    name: string;
    shortCode: string | null;
    acquiredOn: Date;
    validUntil: Date | null;
    proofUrl: string | null;
    series: string | null;
  }[];
}

async function loadCertifications(locale: Locale): Promise<CertificationGroup[]> {
  const cats = await db.taxonomy.findMany({
    where: { kind: "CERTIFICATION" },
    orderBy: { sortOrder: "asc" },
    include: { certifications: { orderBy: { sortOrder: "asc" } } },
  });
  return cats
    .map((cat) => ({
      category: locale === "en" ? cat.nameEn : cat.nameDe,
      items: cat.certifications.map((c) => ({
        id: c.id,
        name: c.name,
        shortCode: c.shortCode,
        acquiredOn: c.acquiredOn,
        validUntil: c.validUntil,
        proofUrl: c.proofUrl,
        series: c.series,
      })),
    }))
    .filter((g) => g.items.length > 0);
}

export async function getCertifications(locale: Locale): Promise<CertificationGroup[]> {
  const run = cachedQuery(loadCertifications, ["certs", locale], [tags.certificationList(locale)]);
  try {
    return await run(locale);
  } catch {
    return [];
  }
}
