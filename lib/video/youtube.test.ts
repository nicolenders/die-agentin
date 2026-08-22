import { describe, it, expect } from "vitest";
import {
  extractYouTubeId,
  isYouTubeId,
  parseVideoList,
  youtubeThumbnailUrls,
  youtubeWatchUrl,
} from "./youtube";

describe("extractYouTubeId", () => {
  it("nimmt eine blanke Kennung", () => {
    expect(extractYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("erkennt die Formen, die beim Kopieren entstehen", () => {
    const cases = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abc123",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      "www.youtube.com/watch?v=dQw4w9WgXcQ",
    ];
    for (const value of cases) {
      expect(extractYouTubeId(value), value).toBe("dQw4w9WgXcQ");
    }
  });

  it("verträgt Leerraum ringsum", () => {
    expect(extractYouTubeId("  https://youtu.be/dQw4w9WgXcQ  ")).toBe("dQw4w9WgXcQ");
  });

  it("rät nicht bei fremden Adressen", () => {
    expect(extractYouTubeId("https://vimeo.com/123456789")).toBeNull();
    expect(extractYouTubeId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(extractYouTubeId("kein Link")).toBeNull();
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId(null)).toBeNull();
  });

  it("lehnt zu kurze und zu lange Kennungen ab", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=kurz")).toBeNull();
    expect(extractYouTubeId("https://youtu.be/viel-zu-lange-kennung")).toBeNull();
  });

  it("lässt sich nicht von einer ähnlich aussehenden Domain täuschen", () => {
    expect(extractYouTubeId("https://youtube.com.angreifer.example/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(extractYouTubeId("https://notyoutube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("isYouTubeId", () => {
  it("prüft Länge und Alphabet", () => {
    expect(isYouTubeId("dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeId("dQw4w9WgXc")).toBe(false);
    expect(isYouTubeId("dQw4w9WgXc!")).toBe(false);
  });
});

describe("youtubeWatchUrl", () => {
  it("baut die kanonische Adresse", () => {
    expect(youtubeWatchUrl("dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});

describe("youtubeThumbnailUrls", () => {
  it("beginnt mit der besten Auflösung und endet bei der, die es immer gibt", () => {
    const urls = youtubeThumbnailUrls("dQw4w9WgXcQ");
    expect(urls[0]).toContain("maxresdefault");
    expect(urls[urls.length - 1]).toContain("hqdefault");
    expect(urls.every((u) => u.startsWith("https://i.ytimg.com/vi/dQw4w9WgXcQ/"))).toBe(true);
  });
});

describe("parseVideoList", () => {
  it("liest eine Adresse je Zeile", () => {
    const r = parseVideoList("https://youtu.be/dQw4w9WgXcQ\nhttps://www.youtube.com/watch?v=aaaaaaaaaaa");
    expect(r.ok.map((e) => e.videoId)).toEqual(["dQw4w9WgXcQ", "aaaaaaaaaaa"]);
    expect(r.bad).toEqual([]);
  });

  it("nimmt ein Jahr hinter dem Trennstrich", () => {
    const r = parseVideoList("https://youtu.be/dQw4w9WgXcQ | 2021");
    expect(r.ok[0]?.year).toBe(2021);
  });

  it("ignoriert ein unsinniges Jahr, statt es zu übernehmen", () => {
    expect(parseVideoList("https://youtu.be/dQw4w9WgXcQ | 1899").ok[0]?.year).toBeNull();
    expect(parseVideoList("https://youtu.be/dQw4w9WgXcQ | bald").ok[0]?.year).toBeNull();
  });

  it("übergeht Leerzeilen und Kommentare", () => {
    const r = parseVideoList("\n# Kanal A\nhttps://youtu.be/dQw4w9WgXcQ\n\n");
    expect(r.ok).toHaveLength(1);
    expect(r.bad).toEqual([]);
  });

  it("meldet unlesbare Zeilen mit ihrer Nummer, statt sie zu verschlucken", () => {
    const r = parseVideoList("https://youtu.be/dQw4w9WgXcQ\nhttps://vimeo.com/1\n");
    expect(r.bad).toHaveLength(1);
    expect(r.bad[0]?.line).toBe(2);
    expect(r.bad[0]?.raw).toBe("https://vimeo.com/1");
  });

  it("legt ein doppelt genanntes Video nur einmal an", () => {
    const r = parseVideoList("https://youtu.be/dQw4w9WgXcQ\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(r.ok).toHaveLength(1);
    expect(r.duplicates).toEqual(["dQw4w9WgXcQ"]);
  });

  it("kommt mit leerer Eingabe zurecht", () => {
    expect(parseVideoList("")).toEqual({ ok: [], bad: [], duplicates: [] });
  });
});
