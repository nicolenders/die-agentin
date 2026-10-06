import { describe, it, expect } from "vitest";
import {
  MAX_DISPATCH_IMAGES,
  imageRows,
  lacksEnglishAlt,
  parseImageIds,
  toPoolImage,
  usageByLocale,
} from "./images";

describe("dispatches/images", () => {
  describe("parseImageIds", () => {
    it("entfernt Leerwerte und Dubletten, behält die Reihenfolge", () => {
      expect(parseImageIds(["b", "", " a ", "b", null, "c"])).toEqual(["b", "a", "c"]);
    });

    it("kappt bei der Obergrenze", () => {
      const many = Array.from({ length: MAX_DISPATCH_IMAGES + 5 }, (_, i) => `id${i}`);
      expect(parseImageIds(many)).toHaveLength(MAX_DISPATCH_IMAGES);
    });
  });

  it("imageRows nummeriert in Formularreihenfolge", () => {
    expect(imageRows("d1", ["x", "y"])).toEqual([
      { dispatchId: "d1", assetId: "x", sortOrder: 0 },
      { dispatchId: "d1", assetId: "y", sortOrder: 1 },
    ]);
  });

  describe("toPoolImage", () => {
    const row = {
      id: "a1",
      blobPath: "a1/original.webp",
      altDe: "Bühne",
      altEn: "  ",
      decorative: false,
      source: "AI",
    };

    it("baut die Proxy-URL und erkennt KI-Bilder", () => {
      const img = toPoolImage(row);
      expect(img.url).toBe("/media/a1/original.webp");
      expect(img.ai).toBe(true);
    });

    it("behandelt einen leeren englischen Alt-Text als fehlend", () => {
      expect(toPoolImage(row).altEn).toBeNull();
      expect(lacksEnglishAlt(toPoolImage(row))).toBe(true);
    });

    it("verlangt bei dekorativen Bildern keinen englischen Alt-Text", () => {
      expect(lacksEnglishAlt(toPoolImage({ ...row, decorative: true }))).toBe(false);
    });
  });

  describe("usageByLocale", () => {
    const doc = (ids: string[]) =>
      JSON.stringify({
        type: "doc",
        content: ids.map((assetId) => ({ type: "image", attrs: { assetId } })),
      });

    it("ordnet jedes Bild den Sprachen zu, in deren Text es steht", () => {
      const usage = usageByLocale([
        { locale: "de", bodyJson: doc(["a", "b"]) },
        { locale: "en", bodyJson: doc(["a"]) },
      ]);
      expect(usage.get("a")).toEqual(["de", "en"]);
      expect(usage.get("b")).toEqual(["de"]);
      expect(usage.has("c")).toBe(false);
    });

    it("übergeht kaputtes JSON", () => {
      expect(usageByLocale([{ locale: "de", bodyJson: "{nope" }]).size).toBe(0);
    });
  });
});
