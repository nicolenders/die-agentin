import { describe, it, expect } from "vitest";
import { absoluteAssetUrl, assetAlt, toHeroImage, type HeroAssetRow } from "./hero";

const base: HeroAssetRow = {
  blobPath: "abc.webp",
  width: 1600,
  height: 900,
  altDe: "Agentin am Schreibtisch",
  altEn: "Agent at her desk",
  decorative: false,
  source: "MINE",
};

describe("assetAlt", () => {
  it("nimmt den deutschen Alt-Text auf der deutschen Seite", () => {
    expect(assetAlt(base, "de")).toBe("Agentin am Schreibtisch");
  });

  it("nimmt den englischen Alt-Text auf der englischen Seite", () => {
    expect(assetAlt(base, "en")).toBe("Agent at her desk");
  });

  it("fällt ohne englische Fassung auf Deutsch zurück", () => {
    expect(assetAlt({ ...base, altEn: null }, "en")).toBe("Agentin am Schreibtisch");
    expect(assetAlt({ ...base, altEn: "" }, "en")).toBe("Agentin am Schreibtisch");
  });

  it("lässt dekorative Bilder ohne Alt-Text", () => {
    expect(assetAlt({ ...base, decorative: true }, "de")).toBe("");
  });
});

describe("toHeroImage", () => {
  it("liefert null ohne zugewiesenes Bild", () => {
    expect(toHeroImage(null, "de")).toBeNull();
    expect(toHeroImage(undefined, "de")).toBeNull();
  });

  it("baut URL, Alt-Text und Maße", () => {
    expect(toHeroImage(base, "de")).toEqual({
      url: "/media/abc.webp",
      alt: "Agentin am Schreibtisch",
      decorative: false,
      ai: false,
      width: 1600,
      height: 900,
    });
  });

  it("markiert KI-generierte Bilder", () => {
    expect(toHeroImage({ ...base, source: "AI" }, "de")?.ai).toBe(true);
    expect(toHeroImage({ ...base, source: "OTHER" }, "de")?.ai).toBe(false);
  });
});

describe("absoluteAssetUrl", () => {
  it("stellt dem Proxy-Pfad den Origin voran", () => {
    expect(absoluteAssetUrl("/media/abc.webp", "https://nicolenders.com")).toBe(
      "https://nicolenders.com/media/abc.webp",
    );
  });

  it("lässt absolute URLs unverändert", () => {
    expect(absoluteAssetUrl("https://cdn.example/abc.webp", "https://nicolenders.com")).toBe(
      "https://cdn.example/abc.webp",
    );
  });

  it("verträgt Origin mit Schrägstrich und Pfad ohne", () => {
    expect(absoluteAssetUrl("uploads/abc.webp", "https://nicolenders.com/")).toBe(
      "https://nicolenders.com/uploads/abc.webp",
    );
  });
});
