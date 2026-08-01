import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { pickTranslation } from "@/lib/content/pick";
import { assetUrl } from "@/lib/media/url";
import type { Locale } from "@/lib/i18n/config";
import type { MissionStatus } from "@/lib/domain";

export interface MissionListItem {
  id: string;
  slug: string | null;
  eventName: string;
  city: string;
  countryCode: string;
  lat: number;
  lon: number;
  startDate: Date;
  status: MissionStatus;
  future: boolean;
  eventUrl: string | null;
}

async function loadMissions(locale: Locale, nowMs: number): Promise<MissionListItem[]> {
  const missions = await db.mission.findMany({ orderBy: { startDate: "desc" }, include: { translations: true } });
  return missions.map((m) => {
    const picked = pickTranslation(m.translations, locale);
    return {
      id: m.id,
      slug: picked?.translation.slug ?? null,
      eventName: m.eventName,
      city: m.city,
      countryCode: m.countryCode,
      lat: m.lat,
      lon: m.lon,
      startDate: m.startDate,
      status: m.status as MissionStatus,
      future: m.startDate.getTime() > nowMs,
      eventUrl: m.eventUrl,
    };
  });
}

export async function getMissions(locale: Locale): Promise<MissionListItem[]> {
  const run = cachedQuery(
    (l: Locale) => loadMissions(l, Date.now()),
    ["missions", locale],
    [tags.missionList(locale)],
  );
  try {
    return await run(locale);
  } catch {
    return [];
  }
}

export interface MissionDetail {
  id: string;
  eventName: string;
  city: string;
  countryCode: string;
  startDate: Date;
  status: MissionStatus;
  eventUrl: string | null;
  slug: string;
  eventText: string;
  talkText: string;
  fallback: boolean;
  contentLocale: Locale;
  photos: { url: string; alt: string; decorative: boolean }[];
  briefing: { title: string; language: string } | null;
}

async function loadMissionBySlug(locale: Locale, slug: string): Promise<MissionDetail | null> {
  const translation = await db.missionTranslation.findFirst({
    where: { slug },
    include: {
      mission: {
        include: {
          translations: true,
          photos: { include: { asset: true }, orderBy: { sortOrder: "asc" } },
          deliveries: { include: { talk: { include: { translations: true } } }, orderBy: { heldOn: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!translation) return null;
  const mission = translation.mission;
  if (mission.contentStatus !== "PUBLISHED") return null;

  const picked = pickTranslation(mission.translations, locale);
  if (!picked) return null;

  const delivery = mission.deliveries[0];
  const talkTitle = delivery
    ? pickTranslation(delivery.talk.translations, locale)?.translation.title ?? null
    : null;

  return {
    id: mission.id,
    eventName: mission.eventName,
    city: mission.city,
    countryCode: mission.countryCode,
    startDate: mission.startDate,
    status: mission.status as MissionStatus,
    eventUrl: mission.eventUrl,
    slug: picked.translation.slug,
    eventText: picked.translation.eventText,
    talkText: picked.translation.talkText,
    fallback: picked.fallback,
    contentLocale: picked.contentLocale,
    photos: mission.photos.map((p) => ({
      url: assetUrl(p.asset.blobPath),
      alt: locale === "en" && p.asset.altEn ? p.asset.altEn : p.asset.altDe,
      decorative: p.asset.decorative,
    })),
    briefing: delivery && talkTitle ? { title: talkTitle, language: delivery.language } : null,
  };
}

export async function getMissionBySlug(locale: Locale, slug: string): Promise<MissionDetail | null> {
  const run = cachedQuery(loadMissionBySlug, ["mission", locale, slug], [tags.missionList(locale)]);
  try {
    return await run(locale, slug);
  } catch {
    return null;
  }
}
