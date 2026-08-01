import { describe, it, expect } from "vitest";
import { buildRssFeed, escapeXml } from "./feed";

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
});
