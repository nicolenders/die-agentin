import { buildRssFeed, type FeedItem } from "@/lib/feed";
import { getPublishedDispatches } from "@/lib/queries/dispatches";
import { getDictionary } from "@/lib/i18n";
import { siteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

const SITE = siteOrigin();

// Deutscher RSS-Feed (SPEC §5) — jetzt Depeschen (Phase 3).
export async function GET() {
  const dict = await getDictionary("de");
  const dispatches = await getPublishedDispatches("de");
  const items: FeedItem[] = dispatches.map((d) => ({
    title: d.title,
    link: `${SITE}/de/depeschen/${d.slug}`,
    description: d.summary ?? "",
    pubDate: d.publishedAt,
    guid: d.id,
  }));
  const xml = buildRssFeed({
    title: `${dict.brand.name} — ${dict.dispatch.namePlural}`,
    description: dict.dispatch.lead,
    siteUrl: `${SITE}/de`,
    feedUrl: `${SITE}/feed.xml`,
    locale: "de",
    items,
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Am Edge cachen, damit normale Abrufe die DB nicht berühren (SPEC §2.1).
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
