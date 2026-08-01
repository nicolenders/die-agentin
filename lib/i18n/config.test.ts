import { describe, it, expect } from "vitest";
import { isLocale, otherLocale, defaultLocale, locales } from "./config";

describe("i18n/config", () => {
  it("kennt genau die Sprachen DE und EN", () => {
    expect(locales).toEqual(["de", "en"]);
  });

  it("hat DE als Standardsprache (Quellsprache)", () => {
    expect(defaultLocale).toBe("de");
  });

  it("erkennt gültige Locales", () => {
    expect(isLocale("de")).toBe(true);
    expect(isLocale("en")).toBe(true);
  });

  it("weist unbekannte Werte zurück", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it("liefert die jeweils andere Sprache", () => {
    expect(otherLocale("de")).toBe("en");
    expect(otherLocale("en")).toBe("de");
  });
});
