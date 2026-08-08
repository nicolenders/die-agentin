import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { pickTranslation } from "@/lib/content/pick";
import { computeRanking, type RankRow, type DateRange } from "./ranking";
import type { Locale } from "@/lib/i18n/config";

export interface BriefingCard {
  id: string;
  title: string;
  abstract: string | null;
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
        include: { translations: true, deliveries: { select: { language: true } } },
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
