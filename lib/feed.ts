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

/**
 * Führt die Einträge der drei Arten zu einem Feed zusammen.
 *
 * Reines Sortieren nach Datum reichte nicht: Einsätze und Briefings tragen als
 * Datum den Zeitpunkt, an dem die Zeile angelegt wurde. Beim Aufbau des
 * Bestands entstanden Dutzende davon an einem Tag — sie waren damit alle
 * „neuer" als jede veröffentlichte Depesche und drängten die Depeschen
 * vollständig aus den 50 Plätzen. Wer den Feed abonniert hatte, bekam Einsätze
 * und Briefings, aber keine einzige Depesche.
 *
 * Deshalb bekommt jede vorhandene Art zuerst ihren garantierten Anteil
 * (`limit / Anzahl der Arten`); die übrigen Plätze füllt das Datum. Innerhalb
 * des Feeds bleibt die Reihenfolge chronologisch.
 */
export function mergeFeedEntries<T extends { kind: FeedKind; pubDate: Date | null }>(
  entries: T[],
  limit: number,
): T[] {
  if (limit <= 0) return [];
  const newestFirst = (a: T, b: T) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0);

  const byKind = new Map<FeedKind, T[]>();
  for (const entry of entries) {
    const list = byKind.get(entry.kind) ?? [];
    list.push(entry);
    byKind.set(entry.kind, list);
  }
  for (const list of byKind.values()) list.sort(newestFirst);

  const present = FEED_KINDS.filter((k) => (byKind.get(k)?.length ?? 0) > 0);
  if (present.length === 0) return [];

  const share = Math.max(1, Math.floor(limit / present.length));
  const picked: T[] = [];
  const rest: T[] = [];
  for (const kind of present) {
    const list = byKind.get(kind) ?? [];
    picked.push(...list.slice(0, share));
    rest.push(...list.slice(share));
  }

  rest.sort(newestFirst);
  picked.push(...rest.slice(0, Math.max(0, limit - picked.length)));
  return picked.sort(newestFirst).slice(0, limit);
}
