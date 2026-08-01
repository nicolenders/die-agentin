import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { pickTranslation } from "@/lib/content/pick";
import type { Locale } from "@/lib/i18n/config";

export interface DossierCard {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  reviewedAt: Date | null;
  categoryName: string | null;
  fallback: boolean;
  contentLocale: Locale;
}

async function loadDossiers(locale: Locale): Promise<DossierCard[]> {
  const dossiers = await db.dossier.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { reviewedAt: "desc" },
    include: { translations: true, category: true },
  });
  const cards: DossierCard[] = [];
  for (const d of dossiers) {
    const reviewed = d.translations.filter((t) => t.state === "REVIEWED");
    const picked = pickTranslation(reviewed, locale);
    if (!picked) continue;
    cards.push({
      id: d.id,
      slug: picked.translation.slug,
      title: picked.translation.title,
      summary: picked.translation.summary,
      reviewedAt: d.reviewedAt,
      categoryName: d.category ? (locale === "en" ? d.category.nameEn : d.category.nameDe) : null,
      fallback: picked.fallback,
      contentLocale: picked.contentLocale,
    });
  }
  return cards;
}

export async function getPublishedDossiers(locale: Locale): Promise<DossierCard[]> {
  const run = cachedQuery(loadDossiers, ["dossiers", locale], [tags.dossierList(locale)]);
  try {
    return await run(locale);
  } catch {
    return [];
  }
}

export interface DossierDetail {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  bodyJson: string;
  tocEnabled: boolean;
  reviewedAt: Date | null;
  createdAt: Date;
  fallback: boolean;
  contentLocale: Locale;
}

async function loadDossierBySlug(locale: Locale, slug: string): Promise<DossierDetail | null> {
  const translation = await db.dossierTranslation.findFirst({
    where: { slug, dossier: { status: "PUBLISHED" } },
    include: { dossier: { include: { translations: true } } },
  });
  if (!translation) return null;
  const dossier = translation.dossier;
  const reviewed = dossier.translations.filter((t) => t.state === "REVIEWED");
  const picked = pickTranslation(reviewed, locale);
  if (!picked) return null;
  return {
    id: dossier.id,
    slug: picked.translation.slug,
    title: picked.translation.title,
    summary: picked.translation.summary,
    bodyJson: picked.translation.bodyJson,
    tocEnabled: picked.translation.tocEnabled,
    reviewedAt: dossier.reviewedAt,
    createdAt: dossier.createdAt,
    fallback: picked.fallback,
    contentLocale: picked.contentLocale,
  };
}

export async function getDossierBySlug(
  locale: Locale,
  slug: string,
): Promise<DossierDetail | null> {
  const run = cachedQuery(loadDossierBySlug, ["dossier", locale, slug], [tags.dossierList(locale)]);
  try {
    return await run(locale, slug);
  } catch {
    return null;
  }
}
