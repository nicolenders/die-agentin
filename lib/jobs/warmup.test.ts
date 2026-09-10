import { describe, it, expect } from "vitest";
import { parseSitemapLocs, toLocalUrls } from "@/lib/jobs/warmup";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://nicolenders.com/de</loc><priority>1</priority></url>
  <url><loc>https://nicolenders.com/de/depeschen/abc</loc></url>
  <url>
    <loc>
      https://nicolenders.com/en
    </loc>
  </url>
</urlset>`;

describe("parseSitemapLocs", () => {
  it("liest alle Adressen", () => {
    expect(parseSitemapLocs(XML)).toEqual([
      "https://nicolenders.com/de",
      "https://nicolenders.com/de/depeschen/abc",
      "https://nicolenders.com/en",
    ]);
  });

  it("hält sich an die Obergrenze", () => {
    expect(parseSitemapLocs(XML, 2)).toHaveLength(2);
  });

  it("kommt mit leerem Text zurecht", () => {
    expect(parseSitemapLocs("")).toEqual([]);
  });
});

describe("toLocalUrls", () => {
  it("tauscht die Domain gegen die lokale Basis und entfernt Doppelte", () => {
    expect(
      toLocalUrls(
        ["https://nicolenders.com/de", "https://www.nicolenders.com/de", "/en"],
        "http://127.0.0.1:3000/",
      ),
    ).toEqual(["http://127.0.0.1:3000/de", "http://127.0.0.1:3000/en"]);
  });
});
