import { describe, it, expect } from "vitest";
import { buildRssFeed, escapeXml, parseFeedKinds, FEED_KINDS } from "./feed";

describe("feed", () => {
  it("escaped XML-Sonderzeichen", () => {
    expect(escapeXml('a & b <c> "d"')).toBe("a &amp; b &lt;c&gt; &quot;d&quot;");
  });

  it("baut einen gültigen RSS-Rahmen mit Items", () => {
    const xml = buildRssFeed({
      title: "Signale",
      description: "Feed",
      siteUrl: "https://nicolenders.com/de",
      feedUrl: "https://nicolenders.com/feed.xml",
      locale: "de",
      items: [
        {
          title: "Titel & mehr",
          link: "https://nicolenders.com/de/signale/x",
          description: "Zusammenfassung",
          pubDate: new Date("2026-07-28T14:20:00Z"),
          guid: "post-1",
        },
      ],
    });
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain("<language>de</language>");
    expect(xml).toContain("Titel &amp; mehr");
    expect(xml).toContain("<guid isPermaLink=\"false\">post-1</guid>");
    expect(xml).toContain("28 Jul 2026");
  });

  it("nimmt die Bildmarke auf, wenn eine angegeben ist", () => {
    const base = {
      title: "Depeschen",
      description: "Feed",
      siteUrl: "https://nicolenders.com/de",
      feedUrl: "https://nicolenders.com/feed.xml",
      locale: "de" as const,
      items: [],
    };
    const withImage = buildRssFeed({ ...base, imageUrl: "https://nicolenders.com/brand/icon-tile-192.png" });
    expect(withImage).toContain("<image>");
    expect(withImage).toContain("<url>https://nicolenders.com/brand/icon-tile-192.png</url>");

    // Ohne Angabe bleibt der Feed unverändert — kein leeres <image>-Element.
    expect(buildRssFeed(base)).not.toContain("<image>");
  });

  it("schreibt die Art als Kategorie in den Eintrag", () => {
    const xml = buildRssFeed({
      title: "Alles",
      description: "Feed",
      siteUrl: "https://nicolenders.com/de",
      feedUrl: "https://nicolenders.com/feed.xml",
      locale: "de",
      items: [
        {
          title: "Einsatz",
          link: "https://nicolenders.com/de/einsaetze/x",
          description: "Einsatz am 3. September 2026",
          pubDate: null,
          guid: "mission-1",
          category: "Einsatz",
        },
        {
          title: "Ohne Kategorie",
          link: "https://nicolenders.com/de/depeschen/y",
          description: "",
          pubDate: null,
          guid: "d-1",
        },
      ],
    });
    expect(xml).toContain("<category>Einsatz</category>");
    // Ohne Angabe bleibt das Element weg, statt leer zu erscheinen.
    expect(xml.match(/<category>/g)).toHaveLength(1);
  });
});

describe("parseFeedKinds", () => {
  it("liefert ohne Angabe alle Arten", () => {
    expect(parseFeedKinds(null)).toEqual([...FEED_KINDS]);
    expect(parseFeedKinds("")).toEqual([...FEED_KINDS]);
  });

  it("versteht die deutschen Namen aus der URL", () => {
    expect(parseFeedKinds("einsaetze")).toEqual(["mission"]);
    expect(parseFeedKinds("Einsätze, Briefings")).toEqual(["mission", "briefing"]);
    expect(parseFeedKinds("depeschen")).toEqual(["dispatch"]);
  });

  it("hält die feste Reihenfolge ein und entfernt Dubletten", () => {
    expect(parseFeedKinds("briefings,depeschen,briefing")).toEqual(["dispatch", "briefing"]);
  });

  it("fällt bei unbekannten Werten auf alle Arten zurück", () => {
    expect(parseFeedKinds("unsinn")).toEqual([...FEED_KINDS]);
  });
});
