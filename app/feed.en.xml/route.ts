import { buildRssFeed, type FeedItem } from "@/lib/feed";
import { getPublishedPosts } from "@/lib/queries/posts";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Englischer RSS-Feed (SPEC §5).
export async function GET() {
  const dict = await getDictionary("en");
  const posts = await getPublishedPosts("en");
  const items: FeedItem[] = posts.map((p) => ({
    title: p.title,
    link: `${SITE}/en/signale/${p.slug}`,
    description: p.summary ?? "",
    pubDate: p.publishedAt,
    guid: `${p.id}-en`,
  }));
  const xml = buildRssFeed({
    title: `${dict.brand.name} — ${dict.nav.signale}`,
    description: dict.feed.lead,
    siteUrl: `${SITE}/en`,
    feedUrl: `${SITE}/feed.en.xml`,
    locale: "en",
    items,
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
