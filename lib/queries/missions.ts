import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { pickTranslation } from "@/lib/content/pick";
import { assetUrl } from "@/lib/media/url";
import { identityDisplayName } from "@/lib/identities";
import { missionTalkLanguage } from "@/lib/mission-language";
import type { Locale } from "@/lib/i18n/config";
import type { MissionStatus } from "@/lib/domain";
import { extractYouTubeId } from "@/lib/video/youtube";

export interface MissionListItem {
  id: string;
  slug: string | null;
  eventName: string;
  city: string;
  countryCode: string;
  lat: number;
  lon: number;
  isOnline: boolean;
  startDate: Date;
  status: MissionStatus;
  future: boolean;
  eventUrl: string | null;
  // Nur veröffentlichte Einsätze haben eine öffentliche Einsatzakte-Detailseite.
  published: boolean;
  // Freigabe der Einsatzakte: erst damit wird die Detailseite verlinkt.
  caseFilePublic: boolean;
  bannerUrl: string | null;
  bannerAlt: string;
  bannerAi: boolean;
  identitySlugs: string[]; // verknüpfte Identitäten (für den Identitätsfilter)
  // Identitäten mit Anzeigename und Farbe — fürs Karten-Popup.
  identities: { slug: string; name: string; color: string }[];
  tools: { slug: string; name: string }[]; // verknüpfte Werkzeuge (Filter + Label)
  // Gehaltenes Briefing (Popup, Liste). Die Sprache steht am Einsatz, nicht am
  // Briefing — dasselbe Briefing wird mal auf Deutsch, mal auf Englisch gehalten.
  briefing: { id: string; title: string } | null;
  /** Vortragssprache dieses Einsatzes („de"/„en") — null, wenn nicht gepflegt. */
  language: string | null;
  /** Länge des Auftritts in Minuten. */
  durationMin: number | null;
}

async function loadMissions(locale: Locale, nowMs: number): Promise<MissionListItem[]> {
  const missions = await db.mission.findMany({
    orderBy: { startDate: "desc" },
    include: {
      translations: true,
      banner: true,
      identities: { orderBy: { sortOrder: "asc" } },
      tools: { select: { slug: true, name: true }, orderBy: { sortOrder: "asc" } },
      deliveries: {
        take: 1,
        orderBy: { heldOn: "desc" },
        include: { talk: { include: { translations: true } } },
      },
    },
  });
  return missions.map((m) => {
    const picked = pickTranslation(m.translations, locale);
    const delivery = m.deliveries[0];
    const talkTitle = delivery
      ? pickTranslation(delivery.talk.translations, locale)?.translation.title ?? null
      : null;
    return {
      id: m.id,
      slug: picked?.translation.slug ?? null,
      eventName: m.eventName,
      city: m.city,
      countryCode: m.countryCode,
      lat: m.lat,
      lon: m.lon,
      isOnline: m.isOnline,
      startDate: m.startDate,
      status: m.status as MissionStatus,
      future: m.startDate.getTime() > nowMs,
      eventUrl: m.eventUrl,
      published: m.contentStatus === "PUBLISHED",
      caseFilePublic: m.caseFilePublic,
      identitySlugs: m.identities.map((i) => i.slug),
      identities: m.identities.map((i) => ({
        slug: i.slug,
        name: identityDisplayName(i, locale),
        color: i.color,
      })),
      tools: m.tools.map((t) => ({ slug: t.slug, name: t.name })),
      briefing: delivery && talkTitle ? { id: delivery.talkId, title: talkTitle } : null,
      language: missionTalkLanguage(m.sessionLanguage, delivery?.language),
      durationMin: m.durationMin,
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
  slidesFileUrl: string | null; // öffentlicher Download-Link der hochgeladenen PDF
  slidesFileName: string | null;
  /**
   * Videos zu diesem Einsatz. Sie haben den früheren Einzelwert
   * `recordingUrl` abgelöst; der bleibt als Rückfall, solange er an einem
   * Einsatz noch steht und niemand ihn in ein Video überführt hat.
   */
  videos: { videoId: string; title: string; channel: string | null; coverUrl: string | null; coverAlt: string; coverAi: boolean }[];
  recordingUrl: string | null;
  recap: string | null;
  coSpeakers: { name: string; url: string | null }[];
  sessionType: string | null;
  /** Vortragssprache („de"/„en"), aus der einen Pflegestelle. */
  sessionLanguage: string | null;
  durationMin: number | null;
  // Publikum in drei Zahlen: vor Ort, zugeschaltet, später abgerufen.
  attendeesOnsite: number | null;
  attendeesRemote: number | null;
  onDemandViews: number | null;
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
          videos: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: { coverAsset: true, translations: true },
          },
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
  const talkLanguage = missionTalkLanguage(mission.sessionLanguage, delivery?.language);

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
    briefing: delivery && talkTitle ? { title: talkTitle, language: talkLanguage ?? delivery.language } : null,
    identities: mission.identities.map((i) => ({ slug: i.slug, name: identityDisplayName(i, locale), color: i.color })),
    slidesFileUrl: mission.slidesFilePath ? assetUrl(mission.slidesFilePath) : null,
    slidesFileName: mission.slidesFileName,
    videos: mission.videos
      .map((v) => ({
        videoId: extractYouTubeId(v.url),
        title:
          pickTranslation(v.translations, locale)?.translation.title ??
          v.translations[0]?.title ??
          "",
        channel: v.publisher,
        coverUrl: v.coverAsset ? assetUrl(v.coverAsset.blobPath) : null,
        coverAlt: v.coverAsset?.altDe ?? "",
        coverAi: v.coverAsset?.source === "AI",
      }))
      .filter((v): v is { videoId: string } & typeof v => Boolean(v.videoId)),
    recordingUrl: mission.recordingUrl,
    recap: locale === "en" && mission.recapEn ? mission.recapEn : mission.recapDe,
    coSpeakers: parseCoSpeakers(mission.coSpeakers),
    sessionType: mission.sessionType,
    sessionLanguage: talkLanguage,
    durationMin: mission.durationMin,
    attendeesOnsite: mission.attendeesOnsite,
    attendeesRemote: mission.attendeesRemote,
    onDemandViews: mission.onDemandViews,
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
