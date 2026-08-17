import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { alternatesFor } from "./alternates";

const ORIGINAL = process.env.PUBLIC_SITE_HOST;

beforeEach(() => {
  process.env.PUBLIC_SITE_HOST = "nicolenders.com";
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.PUBLIC_SITE_HOST;
  else process.env.PUBLIC_SITE_HOST = ORIGINAL;
});

describe("alternatesFor", () => {
  it("setzt canonical auf die eigene Route unter dem kanonischen Host", () => {
    expect(alternatesFor("de", "legende")?.canonical).toBe("https://nicolenders.com/de/legende");
    expect(alternatesFor("en", "legende")?.canonical).toBe("https://nicolenders.com/en/legende");
  });

  it("liefert für das HQ die Locale-Wurzel", () => {
    expect(alternatesFor("de")?.canonical).toBe("https://nicolenders.com/de");
  });

  it("zeigt hreflang auf dieselbe Route in der anderen Sprache", () => {
    const languages = alternatesFor("en", "einsaetze/cim-lingen-2026")?.languages;
    expect(languages).toEqual({
      de: "https://nicolenders.com/de/einsaetze/cim-lingen-2026",
      en: "https://nicolenders.com/en/einsaetze/cim-lingen-2026",
      "x-default": "https://nicolenders.com/de/einsaetze/cim-lingen-2026",
    });
  });

  it("verträgt führende und abschließende Slashes im Pfad", () => {
    expect(alternatesFor("de", "/briefings/")?.canonical).toBe(
      "https://nicolenders.com/de/briefings",
    );
  });
});
