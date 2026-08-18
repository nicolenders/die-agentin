import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { pickTranslation } from "@/lib/content/pick";
import { getPublishedDispatches } from "@/lib/queries/dispatches";
import { getDictionary } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { FEED_KINDS, mergeFeedEntries, type FeedItem, type FeedKind } from "@/lib/feed";
import type { Locale } from "@/lib/i18n/config";

// Inhalte des RSS-Feeds. Der Feed trug lange nur Depeschen; wer die Agentin
// abonniert, will aber auch mitbekommen, wo sie als Nächstes auftritt und was
// neu im Vortragsrepertoire steht. Deshalb liefern hier drei Quellen in einen
// gemeinsamen, nach Datum sortierten Strom.
//
// Die GUIDs der Depeschen bleiben unverändert: ein neuer Schlüssel würde in
// jedem Reader alle alten Depeschen noch einmal als ungelesen zeigen.

/** Höchstzahl der Einträge je Art, bevor zusammengeführt wird. */
const PER_KIND_LIMIT = 30;

/** Höchstzahl der Einträge im fertigen Feed. */
export const FEED_ITEM_LIMIT = 50;

export interface FeedEntry extends FeedItem {
  kind: FeedKind;
}

function suffix(locale: Locale): string {
  return locale === "en" ? "-en" : "";
}

async function loadMissionEntries(locale: Locale) {
  const missions = await db.mission.findMany({
    where: { contentStatus: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: PER_KIND_LIMIT,
    select: {
      id: true,
      eventName: true,
      city: true,
      isOnline: true,
      startDate: true,
      createdAt: true,
      caseFilePublic: true,
      translations: { select: { locale: true, slug: true, state: true } },
    },
  });
  return missions.map((m) => {
    const slug = pickTranslation(m.translations, locale)?.translation.slug ?? null;
    return {
      id: m.id,
      eventName: m.eventName,
      city: m.city,
      isOnline: m.isOnline,
      startDate: m.startDate,
      createdAt: m.createdAt,
      // Ohne freigegebene Einsatzakte gibt es keine Detailseite; der Eintrag
      // führt dann auf die Karte und wählt den Einsatz dort aus.
      slug: m.caseFilePublic && slug ? slug : null,
    };
  });
}

async function loadBriefingEntries(locale: Locale) {
  const talks = await db.talk.findMany({
    where: { active: true, archivedAt: null },
    orderBy: { createdAt: "desc" },
    take: PER_KIND_LIMIT,
    select: {
      id: true,
      createdAt: true,
      translations: { select: { locale: true, title: true, abstract: true } },
    },
  });
  return talks.map((t) => {
    const picked = pickTranslation(t.translations, locale)?.translation;
    return {
      id: t.id,
      createdAt: t.createdAt,
      title: picked?.title ?? "",
      abstract: picked?.abstract ?? "",
    };
  });
}

const cachedMissionEntries = (locale: Locale) =>
  cachedQuery(loadMissionEntries, ["feed-missions", locale], [tags.missionList(locale)])(locale);

const cachedBriefingEntries = (locale: Locale) =>
  cachedQuery(loadBriefingEntries, ["feed-briefings", locale], [tags.briefingList(locale)])(locale);

/**
 * Alle Feed-Einträge der gewünschten Arten, neueste zuerst. Fällt eine Quelle
 * aus (pausierte Datenbank), bleibt der Feed mit den übrigen Arten gültig,
 * statt mit einem Fehler zu antworten.
 */
export async function getFeedEntries(
  locale: Locale,
  kinds: readonly FeedKind[] = FEED_KINDS,
  origin: string = "",
): Promise<FeedEntry[]> {
  const dict = await getDictionary(locale);
  const wanted = new Set(kinds);
  const entries: FeedEntry[] = [];

  if (wanted.has("dispatch")) {
    try {
      const dispatches = await getPublishedDispatches(locale);
      for (const d of dispatches.slice(0, PER_KIND_LIMIT)) {
        entries.push({
          kind: "dispatch",
          title: d.title,
          link: `${origin}/${locale}/depeschen/${d.slug}`,
          description: d.summary ?? "",
          pubDate: d.publishedAt,
          // Unverändert gegenüber dem reinen Depeschen-Feed.
          guid: `${d.id}${suffix(locale)}`,
          category: dict.feed.categoryDispatch,
        });
      }
    } catch {
      // Ohne Depeschen weiter.
    }
  }

  if (wanted.has("mission")) {
    try {
      for (const m of await cachedMissionEntries(locale)) {
        const where = m.isOnline ? dict.feed.online : m.city;
        entries.push({
          kind: "mission",
          title: `${m.eventName} · ${where}`,
          link: m.slug
            ? `${origin}/${locale}/einsaetze/${m.slug}`
            : `${origin}/${locale}/einsaetze?einsatz=${m.id}`,
          description: `${dict.feed.missionOn} ${formatDate(m.startDate, locale)} · ${where}`,
          pubDate: m.createdAt,
          guid: `mission-${m.id}${suffix(locale)}`,
          category: dict.feed.categoryMission,
        });
      }
    } catch {
      // Ohne Einsätze weiter.
    }
  }

  if (wanted.has("briefing")) {
    try {
      for (const t of await cachedBriefingEntries(locale)) {
        if (!t.title.trim()) continue;
        entries.push({
          kind: "briefing",
          title: t.title,
          link: `${origin}/${locale}/briefings?briefing=${t.id}`,
          description: t.abstract?.trim() || dict.feed.briefingFallback,
          pubDate: t.createdAt,
          guid: `briefing-${t.id}${suffix(locale)}`,
          category: dict.feed.categoryBriefing,
        });
      }
    } catch {
      // Ohne Briefings weiter.
    }
  }

  // Nicht bloß nach Datum schneiden: sonst verdrängt eine Art die anderen
  // (siehe `mergeFeedEntries`).
  return mergeFeedEntries(entries, FEED_ITEM_LIMIT);
}
