import { describe, it, expect } from "vitest";
import { gonePage, goneLocale } from "./gone-page";

describe("goneLocale", () => {
  it("nimmt die erste passende Sprache aus dem Header", () => {
    expect(goneLocale("en-US,en;q=0.9")).toBe("en");
    expect(goneLocale("de-DE,de;q=0.9,en;q=0.8")).toBe("de");
  });

  it("fällt auf die Standardsprache zurück", () => {
    for (const header of [null, undefined, "", "fr-FR,fr;q=0.9"]) {
      expect(goneLocale(header)).toBe("de");
    }
  });
});

describe("gonePage", () => {
  it("setzt die Sprache im html-Element", () => {
    expect(gonePage("de")).toContain('<html lang="de">');
    expect(gonePage("en")).toContain('<html lang="en">');
  });

  it("bietet einen Weg weiter, statt nur zu melden", () => {
    const html = gonePage("de");
    expect(html).toContain('href="/de/depeschen"');
    expect(html).toContain('href="/de/einsaetze"');
    expect(html).toContain('href="/de"');
  });

  it("verlinkt in der jeweiligen Sprache", () => {
    const html = gonePage("en");
    expect(html).toContain('href="/en/depeschen"');
    expect(html).not.toContain('href="/de/depeschen"');
  });

  it("verwendet die Texte aus dem Wörterbuch, nicht fest verdrahtete", () => {
    // Deutsch und Englisch müssen sich unterscheiden — sonst hängt irgendwo
    // doch ein fester Text.
    expect(gonePage("de")).not.toBe(gonePage("en"));
    expect(gonePage("en")).toContain("withdrawn");
    expect(gonePage("de")).toContain("eingezogen");
  });

  it("bleibt auch für Suchmaschinen eindeutig als nicht indexierbar markiert", () => {
    expect(gonePage("de")).toContain('name="robots" content="noindex');
  });

  it("ist am Telefon lesbar", () => {
    expect(gonePage("de")).toContain('name="viewport" content="width=device-width');
  });

  it("kommt ohne externe Ressourcen aus", () => {
    // Die Middleware kann die gebündelte CSS-Datei nicht erreichen; ein Verweis
    // darauf ergäbe eine ungestylte Seite.
    const html = gonePage("de");
    expect(html).not.toMatch(/<link[^>]+stylesheet/);
    expect(html).not.toMatch(/<script/);
    expect(html).not.toContain("http://");
  });
});
