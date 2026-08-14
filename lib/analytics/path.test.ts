import { describe, it, expect } from "vitest";
import { normalizePath } from "./path";

describe("normalizePath", () => {
  it("maps the localized home page to '/' + section 'home'", () => {
    expect(normalizePath("/de")).toEqual({ path: "/", locale: "de", section: "home" });
    expect(normalizePath("/en")).toEqual({ path: "/", locale: "en", section: "home" });
  });

  it("strips the locale prefix and keeps the rest of the path", () => {
    expect(normalizePath("/de/einsaetze")).toEqual({
      path: "/einsaetze",
      locale: "de",
      section: "einsaetze",
    });
    expect(normalizePath("/en/identitaeten/collaboration")).toEqual({
      path: "/identitaeten/collaboration",
      locale: "en",
      section: "identitaeten",
    });
  });

  it("removes query string and hash", () => {
    expect(normalizePath("/de/einsaetze?jahr=2026&q=cim#liste")).toEqual({
      path: "/einsaetze",
      locale: "de",
      section: "einsaetze",
    });
  });

  it("defaults to 'de' when there is no locale prefix", () => {
    expect(normalizePath("/einsaetze")).toEqual({
      path: "/einsaetze",
      locale: "de",
      section: "einsaetze",
    });
  });

  it("ignores non-public areas", () => {
    expect(normalizePath("/admin")).toBeNull();
    expect(normalizePath("/de/admin/statistik")).toBeNull();
    expect(normalizePath("/api/track")).toBeNull();
    expect(normalizePath("/de/media/foo.jpg")).toBeNull();
    expect(normalizePath("/_next/static/x.js")).toBeNull();
  });
});
