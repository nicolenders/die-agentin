import { buildRssFeed, type FeedItem } from "@/lib/feed";
import { getPublishedPosts } from "@/lib/queries/posts";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Deutscher RSS-Feed (SPEC §5).
export async function GET() {
  const dict = await getDictionary("de");
  const posts = await getPublishedPosts("de");
  const items: FeedItem[] = posts.map((p) => ({
    title: p.title,
    link: `${SITE}/de/signale/${p.slug}`,
    description: p.summary ?? "",
    pubDate: p.publishedAt,
    guid: p.id,
  }));
  const xml = buildRssFeed({
    title: `${dict.brand.name} — ${dict.nav.signale}`,
    description: dict.feed.lead,
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
