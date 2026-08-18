import { describe, it, expect } from "vitest";
import { buildRssFeed, escapeXml, mergeFeedEntries, parseFeedKinds, FEED_KINDS } from "./feed";

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

describe("mergeFeedEntries", () => {
  // Der Fall aus der Praxis: Einsätze und Briefings wurden beim Aufbau des
  // Bestands am selben Tag angelegt und sind damit „neuer" als jede Depesche.
  const bulk = (kind: "mission" | "briefing", count: number, day: string) =>
    Array.from({ length: count }, (_, i) => ({ kind, id: `${kind}-${i}`, pubDate: new Date(day) }));
  const dispatches = [
    { kind: "dispatch" as const, id: "d-1", pubDate: new Date("2026-06-17T00:00:00Z") },
    { kind: "dispatch" as const, id: "d-2", pubDate: new Date("2026-07-01T00:00:00Z") },
  ];

  it("lässt keine Art von den anderen verdrängen", () => {
    const merged = mergeFeedEntries(
      [...dispatches, ...bulk("mission", 30, "2026-08-18"), ...bulk("briefing", 30, "2026-08-18")],
      50,
    );
    expect(merged).toHaveLength(50);
    expect(merged.filter((e) => e.kind === "dispatch")).toHaveLength(2);
  });

  it("sortiert das Ergebnis nach Datum, neueste zuerst", () => {
    const merged = mergeFeedEntries(
      [...dispatches, ...bulk("mission", 3, "2026-08-18")],
      50,
    );
    const times = merged.map((e) => e.pubDate?.getTime() ?? 0);
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("füllt freie Plätze mit den neuesten Einträgen der übrigen Arten", () => {
    const merged = mergeFeedEntries([...dispatches, ...bulk("mission", 30, "2026-08-18")], 10);
    expect(merged).toHaveLength(10);
    expect(merged.filter((e) => e.kind === "dispatch")).toHaveLength(2);
    expect(merged.filter((e) => e.kind === "mission")).toHaveLength(8);
  });

  it("nutzt alle Plätze, wenn nur eine Art vorliegt", () => {
    expect(mergeFeedEntries(bulk("mission", 30, "2026-08-18"), 10)).toHaveLength(10);
  });

  it("verträgt leere Eingaben und ein Limit von null", () => {
    expect(mergeFeedEntries([], 50)).toEqual([]);
    expect(mergeFeedEntries(dispatches, 0)).toEqual([]);
  });

  it("behandelt Einträge ohne Datum als älteste", () => {
    const undated = { kind: "dispatch" as const, id: "d-0", pubDate: null };
    const merged = mergeFeedEntries([undated, ...dispatches], 50);
    expect(merged[merged.length - 1]).toBe(undated);
  });
});
