import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { pickTranslation } from "@/lib/content/pick";
import { identityDisplayName } from "@/lib/identities";
import { toHeroImage, type HeroImage } from "@/lib/media/hero";
import type { Locale } from "@/lib/i18n/config";
import type { DispatchFormat } from "@/lib/domain";
import { isPublic } from "@/lib/visibility";

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
  /** Titelbild der Depesche — auf der Karte als Vorschau. */
  hero: HeroImage | null;
  /** Radar-Themen (Aufklärung) — Grundlage des „Thema"-Filters. */
  focusTopicIds: string[];
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
      heroAsset: true,
      identities: { orderBy: { sortOrder: "asc" } },
      topics: { orderBy: { sortOrder: "asc" } },
      focusTopics: { select: { id: true } },
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
      hero: toHeroImage(d.heroAsset, locale),
      focusTopicIds: d.focusTopics.map((t) => t.id),
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
  /** Titelbild der Depesche — über dem Text und als OpenGraph-Bild. */
  hero: HeroImage | null;
  fallback: boolean;
  contentLocale: Locale;
}

const detailInclude = {
  translations: true,
  heroAsset: true,
  identities: { orderBy: { sortOrder: "asc" } },
  topics: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.DispatchInclude;

type DetailRow = Prisma.DispatchGetPayload<{ include: typeof detailInclude }>;

/** Baut die Detailansicht aus einer Zeile und den in Frage kommenden Übersetzungen. */
function toDispatchDetail(
  d: DetailRow,
  candidates: DetailRow["translations"],
  locale: Locale,
): DispatchDetail | null {
  const picked = pickTranslation(candidates, locale);
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
    hero: toHeroImage(d.heroAsset, locale),
    fallback: picked.fallback,
    contentLocale: picked.contentLocale,
  };
}

async function loadDispatchBySlug(locale: Locale, slug: string, nowMs: number): Promise<DispatchDetail | null> {
  const translation = await db.dispatchTranslation.findFirst({
    where: { slug, dispatch: { status: "PUBLISHED" } },
    include: { dispatch: { include: detailInclude } },
  });
  if (!translation) return null;
  const d = translation.dispatch;
  if (d.publishedAt && d.publishedAt.getTime() > nowMs) return null;
  return toDispatchDetail(d, d.translations.filter((t) => t.state === "REVIEWED"), locale);
}

/** Depesche in der Vorschau: zusätzlich der Status, den die Seite nicht zeigt. */
export interface DispatchPreview extends DispatchDetail {
  status: string;
  /** Ist die Depesche schon öffentlich sichtbar (zentrale Regel, lib/visibility)? */
  live: boolean;
  /** Sprachen, für die es überhaupt einen Text gibt. */
  locales: Locale[];
}

/**
 * Lädt eine Depesche für die Vorschau (ADR 0033) — unabhängig von Status und
 * Veröffentlichungsdatum und ohne Cache: Wer gerade gespeichert hat, will genau
 * diesen Stand sehen. Aufrufer sind ausschließlich die Admin-Vorschau und der
 * signierte Vorschau-Link; beide prüfen vorher die Berechtigung.
 */
export async function getDispatchPreview(id: string, locale: Locale): Promise<DispatchPreview | null> {
  try {
    const d = await db.dispatch.findUnique({ where: { id }, include: detailInclude });
    if (!d) return null;
    const detail = toDispatchDetail(d, d.translations, locale);
    if (!detail) return null;
    const locales = d.translations.map((t) => t.locale).filter((l): l is Locale => l === "de" || l === "en");
    return { ...detail, status: d.status, live: isPublic(d.status, d.publishedAt), locales };
  } catch {
    return null;
  }
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
