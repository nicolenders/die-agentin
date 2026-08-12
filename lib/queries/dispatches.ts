import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { pickTranslation } from "@/lib/content/pick";
import { identityDisplayName } from "@/lib/identities";
import type { Locale } from "@/lib/i18n/config";
import type { DispatchFormat } from "@/lib/domain";

// Datenzugriff für Depeschen (Phase 3). Sichtbarkeitsregel (SPEC §6 / Phase 4):
// status = PUBLISHED UND publishedAt <= now. Zukünftig terminierte bleiben
// unsichtbar. Phase 4 zentralisiert die Regel; hier ist sie inline angewandt.

export interface IdentityRef {
  slug: string;
  name: string;
  color: string;
}

export interface DispatchCard {
  id: string;
  format: DispatchFormat;
  slug: string;
  title: string;
  summary: string | null;
  publishedAt: Date | null;
  reviewedAt: Date | null;
  identities: IdentityRef[];
  topics: string[];
  fallback: boolean;
  contentLocale: Locale;
}

type IdentityInclude = {
  slug: string;
  codenameDe: string;
  codenameEn: string;
  roleDe: string;
  roleEn: string;
  color: string;
}[];

function mapIdentities(list: IdentityInclude, locale: Locale): IdentityRef[] {
  return list.map((i) => ({ slug: i.slug, name: identityDisplayName(i, locale), color: i.color }));
}

async function loadDispatches(locale: Locale, nowMs: number): Promise<DispatchCard[]> {
  const rows = await db.dispatch.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: {
      translations: true,
      identities: { orderBy: { sortOrder: "asc" } },
      topics: { orderBy: { sortOrder: "asc" } },
    },
  });
  const cards: DispatchCard[] = [];
  for (const d of rows) {
    if (d.publishedAt && d.publishedAt.getTime() > nowMs) continue; // Zukunft: unsichtbar
    const reviewed = d.translations.filter((t) => t.state === "REVIEWED");
    const picked = pickTranslation(reviewed, locale);
    if (!picked) continue;
    cards.push({
      id: d.id,
      format: d.format as DispatchFormat,
      slug: picked.translation.slug,
      title: picked.translation.title,
      summary: picked.translation.summary,
      publishedAt: d.publishedAt,
      reviewedAt: d.reviewedAt,
      identities: mapIdentities(d.identities, locale),
      topics: d.topics.map((t) => (locale === "en" ? t.nameEn : t.nameDe)),
      fallback: picked.fallback,
      contentLocale: picked.contentLocale,
    });
  }
  return cards;
}

export async function getPublishedDispatches(locale: Locale): Promise<DispatchCard[]> {
  const run = cachedQuery(
    (l: Locale) => loadDispatches(l, Date.now()),
    ["dispatches", locale],
    [tags.dispatchList(locale)],
  );
  try {
    return await run(locale);
  } catch {
    return [];
  }
}

export interface DispatchDetail {
  id: string;
  format: DispatchFormat;
  slug: string;
  title: string;
  summary: string | null;
  bodyJson: string;
  tocEnabled: boolean;
  publishedAt: Date | null;
  reviewedAt: Date | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceSite: string | null;
  identities: IdentityRef[];
  topics: string[];
  fallback: boolean;
  contentLocale: Locale;
}

async function loadDispatchBySlug(locale: Locale, slug: string, nowMs: number): Promise<DispatchDetail | null> {
  const translation = await db.dispatchTranslation.findFirst({
    where: { slug, dispatch: { status: "PUBLISHED" } },
    include: {
      dispatch: {
        include: {
          translations: true,
          identities: { orderBy: { sortOrder: "asc" } },
          topics: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  if (!translation) return null;
  const d = translation.dispatch;
  if (d.publishedAt && d.publishedAt.getTime() > nowMs) return null;
  const reviewed = d.translations.filter((t) => t.state === "REVIEWED");
  const picked = pickTranslation(reviewed, locale);
  if (!picked) return null;
  return {
    id: d.id,
    format: d.format as DispatchFormat,
    slug: picked.translation.slug,
    title: picked.translation.title,
    summary: picked.translation.summary,
    bodyJson: picked.translation.bodyJson,
    tocEnabled: picked.translation.tocEnabled,
    publishedAt: d.publishedAt,
    reviewedAt: d.reviewedAt,
    sourceUrl: d.sourceUrl,
    sourceTitle: d.sourceTitle,
    sourceSite: d.sourceSite,
    identities: mapIdentities(d.identities, locale),
    topics: d.topics.map((t) => (locale === "en" ? t.nameEn : t.nameDe)),
    fallback: picked.fallback,
    contentLocale: picked.contentLocale,
  };
}

export async function getDispatchBySlug(locale: Locale, slug: string): Promise<DispatchDetail | null> {
  const run = cachedQuery(
    (l: Locale, s: string) => loadDispatchBySlug(l, s, Date.now()),
    ["dispatch", locale, slug],
    [tags.dispatchList(locale)],
  );
  try {
    return await run(locale, slug);
  } catch {
    return null;
  }
}
