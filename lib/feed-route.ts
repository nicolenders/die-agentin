import { buildRssFeed, parseFeedKinds, FEED_KINDS } from "@/lib/feed";
import { getFeedEntries } from "@/lib/queries/feed";
import { getDictionary } from "@/lib/i18n";
import { siteOrigin } from "@/lib/site";
import type { Locale } from "@/lib/i18n/config";

// Gemeinsamer Rumpf beider Feed-Routen (/feed.xml, /feed.en.xml). Der Feed
// enthält Depeschen, Einsätze und Briefings; `?art=` grenzt auf einzelne Arten
// ein, z. B. `/feed.xml?art=einsaetze,briefings`.

export async function feedResponse(locale: Locale, request: Request): Promise<Response> {
  const site = siteOrigin();
  const path = locale === "en" ? "/feed.en.xml" : "/feed.xml";
  const kinds = parseFeedKinds(new URL(request.url).searchParams.get("art"));
  const dict = await getDictionary(locale);
  const items = await getFeedEntries(locale, kinds, site);

  // Der Titel nennt, was tatsächlich im Feed steckt: bei einer Einschränkung
  // steht dort nur diese Art, sonst der Sammelname.
  const scope =
    kinds.length === FEED_KINDS.length
      ? dict.feed.name
      : kinds
          .map((k) =>
            k === "dispatch"
              ? dict.feed.categoryDispatch
              : k === "mission"
                ? dict.feed.categoryMission
                : dict.feed.categoryBriefing,
          )
          .join(" · ");
  const query = kinds.length === FEED_KINDS.length ? "" : `?art=${kinds.join(",")}`;

  const xml = buildRssFeed({
    title: `${dict.brand.name} · ${scope}`,
    description: dict.feed.description,
    siteUrl: `${site}/${locale}`,
    feedUrl: `${site}${path}${query}`,
    locale,
    items,
    // Bildmarke im Feed — Reader zeigen sie neben dem Titel.
    imageUrl: `${site}/brand/icon-tile-192.png`,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Am Edge cachen, damit normale Abrufe die DB nicht berühren (SPEC §2.1).
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
