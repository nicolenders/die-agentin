import { buildRssFeed, type FeedItem } from "@/lib/feed";
import { getPublishedDispatches } from "@/lib/queries/dispatches";
import { getDictionary } from "@/lib/i18n";
import { siteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

const SITE = siteOrigin();

// Englischer RSS-Feed (SPEC §5) — jetzt Depeschen (Phase 3).
export async function GET() {
  const dict = await getDictionary("en");
  const dispatches = await getPublishedDispatches("en");
  const items: FeedItem[] = dispatches.map((d) => ({
    title: d.title,
    link: `${SITE}/en/depeschen/${d.slug}`,
    description: d.summary ?? "",
    pubDate: d.publishedAt,
    guid: `${d.id}-en`,
  }));
  const xml = buildRssFeed({
    title: `${dict.brand.name} · ${dict.dispatch.namePlural}`,
    description: dict.dispatch.lead,
    siteUrl: `${SITE}/en`,
    feedUrl: `${SITE}/feed.en.xml`,
    locale: "en",
    items,
    // Bildmarke im Feed — Reader zeigen sie neben dem Titel.
    imageUrl: `${SITE}/brand/icon-tile-192.png`,
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
