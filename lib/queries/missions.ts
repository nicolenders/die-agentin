import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { pickTranslation } from "@/lib/content/pick";
import { assetUrl } from "@/lib/media/url";
import { identityDisplayName } from "@/lib/identities";
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
  // Nur veröffentlichte Einsätze haben eine öffentliche Einsatzakte-Detailseite.
  published: boolean;
  bannerUrl: string | null;
  bannerAlt: string;
  bannerAi: boolean;
  identitySlugs: string[]; // verknüpfte Identitäten (für den Identitätsfilter)
}

async function loadMissions(locale: Locale, nowMs: number): Promise<MissionListItem[]> {
  const missions = await db.mission.findMany({
    orderBy: { startDate: "desc" },
    include: { translations: true, banner: true, identities: { select: { slug: true } } },
  });
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
      published: m.contentStatus === "PUBLISHED",
      identitySlugs: m.identities.map((i) => i.slug),
      bannerAi: m.banner?.source === "AI",
      bannerUrl: m.banner ? assetUrl(m.banner.blobPath) : null,
      bannerAlt:
        m.banner && !m.banner.decorative
          ? locale === "en" && m.banner.altEn
            ? m.banner.altEn
            : m.banner.altDe
          : m.eventName,
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
  photos: { url: string; alt: string; decorative: boolean; ai: boolean }[];
  briefing: { title: string; language: string } | null;
  // Belegmaterial (Phase 9)
  identities: { slug: string; name: string; color: string }[];
  slidesUrl: string | null;
  slidesPlatform: string | null;
  slidesFileUrl: string | null; // öffentlicher Download-Link der hochgeladenen PDF
  slidesFileName: string | null;
  recordingUrl: string | null;
  recap: string | null;
  feedbackScore: number | null;
  feedbackSource: string | null;
  coSpeakers: { name: string; url: string | null }[];
  sessionType: string | null;
  sessionLanguage: string | null;
  attendeeCount: number | null;
}

function parseCoSpeakers(json: string | null): { name: string; url: string | null }[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((c) => ({ name: String(c?.name ?? "").trim(), url: c?.url ? String(c.url) : null }))
      .filter((c) => c.name);
  } catch {
    return [];
  }
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
          identities: { orderBy: { sortOrder: "asc" } },
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
      ai: p.asset.source === "AI",
    })),
    briefing: delivery && talkTitle ? { title: talkTitle, language: delivery.language } : null,
    identities: mission.identities.map((i) => ({ slug: i.slug, name: identityDisplayName(i, locale), color: i.color })),
    slidesUrl: mission.slidesUrl,
    slidesPlatform: mission.slidesPlatform,
    slidesFileUrl: mission.slidesFilePath ? assetUrl(mission.slidesFilePath) : null,
    slidesFileName: mission.slidesFileName,
    recordingUrl: mission.recordingUrl,
    recap: locale === "en" && mission.recapEn ? mission.recapEn : mission.recapDe,
    feedbackScore: mission.feedbackScore,
    feedbackSource: mission.feedbackSource,
    coSpeakers: parseCoSpeakers(mission.coSpeakers),
    sessionType: mission.sessionType,
    sessionLanguage: mission.sessionLanguage,
    attendeeCount: mission.attendeeCount,
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
