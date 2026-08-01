import type { Locale } from "./i18n/config";

// RSS-Feed-Erzeugung (SPEC §5: /feed.xml, /feed.en.xml). Reine Funktion,
// unit-getestet. XML wird korrekt escaped.

export interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: Date | null;
  guid: string;
}

export interface FeedInput {
  title: string;
  description: string;
  siteUrl: string;
  feedUrl: string;
  locale: Locale;
  items: FeedItem[];
}

export function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildRssFeed(input: FeedInput): string {
  const items = input.items
    .map((item) => {
      const date = item.pubDate ? item.pubDate.toUTCString() : "";
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <description>${escapeXml(item.description)}</description>${
        date ? `\n      <pubDate>${date}</pubDate>` : ""
      }
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(input.title)}</title>
    <link>${escapeXml(input.siteUrl)}</link>
    <description>${escapeXml(input.description)}</description>
    <language>${input.locale}</language>
    <atom:link href="${escapeXml(input.feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}
