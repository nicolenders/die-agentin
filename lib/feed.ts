import type { Locale } from "./i18n/config";

// RSS-Feed-Erzeugung (SPEC §5: /feed.xml, /feed.en.xml). Reine Funktion,
// unit-getestet. XML wird korrekt escaped.

export interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: Date | null;
  guid: string;
  /** Art des Eintrags im Klartext („Depesche", „Einsatz", „Briefing"). Reader
   *  zeigen sie als Kategorie und lassen danach filtern. */
  category?: string;
}

export interface FeedInput {
  title: string;
  description: string;
  siteUrl: string;
  feedUrl: string;
  locale: Locale;
  items: FeedItem[];
  /** Bildmarke des Feeds — Reader zeigen sie neben dem Titel (optional). */
  imageUrl?: string;
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
        item.category ? `\n      <category>${escapeXml(item.category)}</category>` : ""
      }${date ? `\n      <pubDate>${date}</pubDate>` : ""}
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
    <atom:link href="${escapeXml(input.feedUrl)}" rel="self" type="application/rss+xml" />${
      input.imageUrl
        ? `
    <image>
      <url>${escapeXml(input.imageUrl)}</url>
      <title>${escapeXml(input.title)}</title>
      <link>${escapeXml(input.siteUrl)}</link>
    </image>`
        : ""
    }
${items}
  </channel>
</rss>`;
}

// ---------------------------------------------------------------------------
// Feed-Arten. Der Feed trägt nicht mehr nur Depeschen, sondern auch neue
// Einsätze und neue Briefings. Wer nur einen Teil abonnieren will, hängt
// `?art=` an die Feed-Adresse (`/feed.xml?art=einsaetze,briefings`).
// ---------------------------------------------------------------------------

export const FEED_KINDS = ["dispatch", "mission", "briefing"] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

// Erlaubte Schreibweisen im Query-Parameter. Deutsch wie die Routen, Englisch
// als Bequemlichkeit — beides ohne Umlaut-Zwang.
const KIND_ALIASES: Record<string, FeedKind> = {
  depeschen: "dispatch",
  depesche: "dispatch",
  dispatches: "dispatch",
  dispatch: "dispatch",
  einsaetze: "mission",
  einsätze: "mission",
  einsatz: "mission",
  missions: "mission",
  mission: "mission",
  briefings: "briefing",
  briefing: "briefing",
  talks: "briefing",
  talk: "briefing",
};

/**
 * Liest den Filter `?art=` aus. Ohne Angabe (oder bei unbekannten Werten)
 * enthält der Feed alles: ein Tippfehler soll keinen leeren Feed ergeben.
 * Die Reihenfolge folgt immer `FEED_KINDS`, nicht der Eingabe.
 */
export function parseFeedKinds(value: string | null | undefined): FeedKind[] {
  if (!value) return [...FEED_KINDS];
  const picked = new Set<FeedKind>();
  for (const part of value.split(",")) {
    const kind = KIND_ALIASES[part.trim().toLowerCase()];
    if (kind) picked.add(kind);
  }
  if (picked.size === 0) return [...FEED_KINDS];
  return FEED_KINDS.filter((k) => picked.has(k));
}
