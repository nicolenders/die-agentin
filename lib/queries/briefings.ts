import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { pickTranslation } from "@/lib/content/pick";
import { computeRanking, type RankRow, type DateRange } from "./ranking";
import type { Locale } from "@/lib/i18n/config";

export interface BriefingCard {
  id: string;
  title: string;
  abstract: string | null;
  audiences: string[];
  level: string | null;
  durationMin: number | null;
  deCount: number;
  enCount: number;
}

export interface BriefingCategory {
  id: string;
  name: string;
  talks: BriefingCard[];
}

async function loadCatalog(locale: Locale): Promise<BriefingCategory[]> {
  const cats = await db.taxonomy.findMany({
    where: { kind: "TALK" },
    orderBy: { sortOrder: "asc" },
    include: {
      talkMulti: {
        where: { active: true },
        include: {
          translations: true,
          deliveries: { select: { language: true } },
          audiences: { select: { nameDe: true, nameEn: true } },
        },
      },
    },
  });

  return cats
    .map((cat) => ({
      id: cat.id,
      name: locale === "en" ? cat.nameEn : cat.nameDe,
      talks: cat.talkMulti.map((t): BriefingCard => {
        const picked = pickTranslation(t.translations, locale);
        return {
          id: t.id,
          title: picked?.translation.title ?? "",
          abstract: picked?.translation.abstract ?? null,
          audiences: t.audiences.map((a) => (locale === "en" ? a.nameEn : a.nameDe)),
          level: t.level,
          durationMin: t.durationMin,
          deCount: t.deliveries.filter((d) => d.language !== "en").length,
          enCount: t.deliveries.filter((d) => d.language === "en").length,
        };
      }),
    }))
    .filter((cat) => cat.talks.length > 0);
}

export async function getBriefingCatalog(locale: Locale): Promise<BriefingCategory[]> {
  const run = cachedQuery(loadCatalog, ["briefings", locale], [tags.briefingList(locale)]);
  try {
    return await run(locale);
  } catch {
    return [];
  }
}

export interface BriefingListItem {
  id: string;
  title: string;
  abstract: string | null;
  categories: string[];
  audiences: string[];
  level: string | null;
  durationMin: number | null;
  deCount: number;
  enCount: number;
  total: number;
  lastHeld: string | null; // ISO
}

// Jedes aktive Briefing GENAU EINMAL, mit allen Kategorien als Liste, sortiert
// nach Häufigkeit (Einsätze). Grundlage für die einheitliche, filterbare
// Briefings-Seite (kein Duplikat je Kategorie mehr).
async function loadBriefingList(locale: Locale): Promise<BriefingListItem[]> {
  const talks = await db.talk.findMany({
    where: { active: true },
    include: {
      translations: true,
      categories: { select: { nameDe: true, nameEn: true } },
      audiences: { select: { nameDe: true, nameEn: true } },
      deliveries: { select: { language: true, heldOn: true } },
    },
  });

  const items = talks.map((t): BriefingListItem => {
    const picked = pickTranslation(t.translations, locale);
    const lastHeld = t.deliveries.reduce<Date | null>(
      (max, d) => (max === null || d.heldOn > max ? d.heldOn : max),
      null,
    );
    return {
      id: t.id,
      title: picked?.translation.title ?? "",
      abstract: picked?.translation.abstract ?? null,
      categories: t.categories.map((c) => (locale === "en" ? c.nameEn : c.nameDe)),
      audiences: t.audiences.map((a) => (locale === "en" ? a.nameEn : a.nameDe)),
      level: t.level,
      durationMin: t.durationMin,
      deCount: t.deliveries.filter((d) => d.language !== "en").length,
      enCount: t.deliveries.filter((d) => d.language === "en").length,
      total: t.deliveries.length,
      lastHeld: lastHeld ? lastHeld.toISOString() : null,
    };
  });

  return items.sort(
    (a, b) => b.total - a.total || a.title.localeCompare(b.title, locale),
  );
}

export async function getBriefingList(locale: Locale): Promise<BriefingListItem[]> {
  const run = cachedQuery(loadBriefingList, ["briefing-list", locale], [tags.briefingList(locale)]);
  try {
    return await run(locale);
  } catch {
    return [];
  }
}

export async function getBriefingRanking(
  locale: Locale,
  range?: DateRange,
): Promise<RankRow[]> {
  try {
    const talks = await db.talk.findMany({
      include: { translations: true, category: true, deliveries: true },
    });
    const meta = talks.map((t) => ({
      id: t.id,
      title: pickTranslation(t.translations, locale)?.translation.title ?? t.id,
      level: t.level,
      categoryName: t.category ? (locale === "en" ? t.category.nameEn : t.category.nameDe) : null,
    }));
    const deliveries = talks.flatMap((t) =>
      t.deliveries.map((d) => ({ talkId: t.id, language: d.language, heldOn: d.heldOn })),
    );
    return computeRanking(meta, deliveries, range);
  } catch {
    return [];
  }
}
