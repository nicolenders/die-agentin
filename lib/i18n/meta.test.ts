import { describe, it, expect } from "vitest";
import de from "./dictionaries/de";
import en from "./dictionaries/en";
import { META_DESCRIPTION_MAX } from "@/lib/seo/description";

// Audit 1.2: Jede Route hat ihre eigene Meta-Description. Der Test hält zwei
// Zusagen fest, die sich beim Pflegen leicht verlieren — Eindeutigkeit und
// Länge — und deckt beide Sprachen ab.

const dictionaries = { de, en } as const;

describe.each(Object.entries(dictionaries))("meta-Beschreibungen (%s)", (locale, dict) => {
  const descriptions = Object.entries(dict.meta).filter(([key]) => key !== "titleDefault");

  it("hat für jede Route einen Eintrag", () => {
    expect(descriptions.length).toBeGreaterThanOrEqual(13);
  });

  it.each(descriptions)("»%s« bleibt unter %i Zeichen", (key, value) => {
    expect(value.length, `${locale}.meta.${key} ist ${value.length} Zeichen lang`).toBeLessThanOrEqual(
      META_DESCRIPTION_MAX,
    );
  });

  it("verwendet keinen Text doppelt", () => {
    const seen = new Map<string, string>();
    for (const [key, value] of descriptions) {
      const previous = seen.get(value);
      expect(previous, `${locale}.meta.${key} wiederholt ${locale}.meta.${previous}`).toBeUndefined();
      seen.set(value, key);
    }
  });

  it("nennt keine Kennzahl, die still veralten kann", () => {
    for (const [key, value] of descriptions) {
      expect(value, `${locale}.meta.${key} enthält eine Zahl mit Zählcharakter`).not.toMatch(
        /\d+\s*(Einsätze|Briefings|Länder|missions|briefings|countries)/i,
      );
    }
  });

  it("übernimmt nicht den Hero-Lead als Description", () => {
    for (const [, value] of descriptions) {
      expect(value).not.toBe(dict.hq.lead);
    }
  });
});
