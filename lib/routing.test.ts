import { describe, it, expect } from "vitest";
import {
  isNonLocalizedPath,
  hasLocalePrefix,
  localeFromPath,
  pickLocaleFrom,
  legacyDispatchTarget,
} from "./routing";

describe("isNonLocalizedPath", () => {
  it("excludes the exact roots (regression: /admin must not be localized)", () => {
    expect(isNonLocalizedPath("/admin")).toBe(true);
    expect(isNonLocalizedPath("/admin/anmelden")).toBe(true);
    expect(isNonLocalizedPath("/api")).toBe(true);
    expect(isNonLocalizedPath("/api/jobs/run")).toBe(true);
    expect(isNonLocalizedPath("/preview/abc123")).toBe(true);
    expect(isNonLocalizedPath("/media/uploads/x.webp")).toBe(true);
    expect(isNonLocalizedPath("/_next/data/x")).toBe(true);
  });
  it("excludes machine-readable files (have an extension)", () => {
    expect(isNonLocalizedPath("/robots.txt")).toBe(true);
    expect(isNonLocalizedPath("/sitemap.xml")).toBe(true);
    expect(isNonLocalizedPath("/feed.en.xml")).toBe(true);
    expect(isNonLocalizedPath("/llms.txt")).toBe(true);
    expect(isNonLocalizedPath("/icon.svg")).toBe(true);
  });
  it("does NOT exclude real public paths", () => {
    expect(isNonLocalizedPath("/")).toBe(false);
    expect(isNonLocalizedPath("/einsaetze")).toBe(false);
    expect(isNonLocalizedPath("/depeschen")).toBe(false);
    // darf keine Präfix-Kollision geben (administrator ≠ admin)
    expect(isNonLocalizedPath("/administratoren")).toBe(false);
  });
});

describe("hasLocalePrefix", () => {
  it("detects locale roots and subpaths", () => {
    expect(hasLocalePrefix("/de")).toBe(true);
    expect(hasLocalePrefix("/en")).toBe(true);
    expect(hasLocalePrefix("/de/einsaetze")).toBe(true);
    expect(hasLocalePrefix("/einsaetze")).toBe(false);
    expect(hasLocalePrefix("/dentist")).toBe(false); // nicht /de/
  });
});

describe("pickLocaleFrom", () => {
  it("uses Accept-Language, falls back to default (de)", () => {
    expect(pickLocaleFrom("en-US,en;q=0.9")).toBe("en");
    expect(pickLocaleFrom("de-DE,de;q=0.9")).toBe("de");
    expect(pickLocaleFrom("fr-FR")).toBe("de"); // nicht unterstützt → Standard
    expect(pickLocaleFrom(null)).toBe("de");
    expect(pickLocaleFrom("")).toBe("de");
  });
});

describe("legacyDispatchTarget", () => {
  it("maps signale/dossiers to depeschen", () => {
    expect(legacyDispatchTarget("/de/signale")).toEqual({ path: "/de/depeschen", search: "" });
    expect(legacyDispatchTarget("/de/signale/foo")).toEqual({ path: "/de/depeschen/foo", search: "" });
    expect(legacyDispatchTarget("/de/dossiers")).toEqual({ path: "/de/depeschen", search: "?format=REFERENCE" });
    expect(legacyDispatchTarget("/en/dossiers/bar")).toEqual({ path: "/en/depeschen/bar", search: "" });
  });
  it("returns null for non-legacy paths", () => {
    expect(legacyDispatchTarget("/de/depeschen")).toBeNull();
    expect(legacyDispatchTarget("/de/einsaetze")).toBeNull();
    expect(legacyDispatchTarget("/admin")).toBeNull();
  });
});

// Audit 6.6: Ohne diese Ableitung bekämen englische Besucher eine deutsche
// 404-Seite — `not-found.tsx` erreicht im App Router keine `params`.
describe("localeFromPath", () => {
  it("liest die Sprache aus dem Pfad", () => {
    expect(localeFromPath("/en")).toBe("en");
    expect(localeFromPath("/en/gibtsnicht")).toBe("en");
    expect(localeFromPath("/de/briefings")).toBe("de");
  });

  it("liefert null ohne Sprachpräfix", () => {
    expect(localeFromPath("/")).toBeNull();
    expect(localeFromPath("/briefings")).toBeNull();
    expect(localeFromPath("/admin/briefings")).toBeNull();
  });

  it("lässt sich von einem ähnlichen Segment nicht täuschen", () => {
    expect(localeFromPath("/deutschland")).toBeNull();
    expect(localeFromPath("/endlich/mehr")).toBeNull();
  });
});
