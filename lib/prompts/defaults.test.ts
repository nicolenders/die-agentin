import { describe, it, expect } from "vitest";
import { DEFAULT_SNIPPETS, DEFAULT_TEMPLATES } from "./defaults";
import { checkBody, placeholdersFor, offersIdentityChoice } from "./catalog";
import { renderPrompt } from "./render";

const snippetKeys = DEFAULT_SNIPPETS.map((s) => s.key);
const snippetBodies = Object.fromEntries(DEFAULT_SNIPPETS.map((s) => [s.key, s.body]));

describe("Standardsatz", () => {
  it("vergibt jeden Schlüssel nur einmal", () => {
    expect(new Set(DEFAULT_TEMPLATES.map((t) => t.key)).size).toBe(DEFAULT_TEMPLATES.length);
    expect(new Set(snippetKeys).size).toBe(snippetKeys.length);
  });

  it("gibt jeder Vorlage einen Namen und einen Zweck", () => {
    for (const t of DEFAULT_TEMPLATES) {
      expect(t.title.length, t.key).toBeGreaterThan(0);
      expect(t.purpose.length, t.key).toBeGreaterThan(0);
      expect(t.body.length, t.key).toBeGreaterThan(0);
    }
  });

  it("spricht nur Platzhalter an, die es im Katalog gibt", () => {
    for (const t of DEFAULT_TEMPLATES) {
      const problems = checkBody(t.body, t.subject, t.withIdentities, snippetKeys);
      expect(problems.unknownPlaceholders, `${t.key}: unbekannte Platzhalter`).toEqual([]);
      expect(problems.unknownSnippets, `${t.key}: unbekannte Bausteine`).toEqual([]);
    }
  });

  it("hängt an jede Bildvorlage den Stil-Baustein", () => {
    for (const t of DEFAULT_TEMPLATES.filter((x) => x.kind === "IMAGE")) {
      expect(t.body, t.key).toContain("{{baustein.stil}}");
    }
  });

  it("gibt jeder Bildvorlage ein Seitenverhältnis", () => {
    for (const t of DEFAULT_TEMPLATES.filter((x) => x.kind === "IMAGE")) {
      expect(t.aspect, t.key).toBeTruthy();
    }
  });

  it("bietet die Identitätsauswahl nicht doppelt an", () => {
    for (const t of DEFAULT_TEMPLATES.filter((x) => x.subject === "IDENTITY")) {
      expect(offersIdentityChoice(t.subject, t.withIdentities), t.key).toBe(false);
    }
  });

  it("ergibt ohne jeden Wert einen brauchbaren Text statt Klammersalat", () => {
    for (const t of DEFAULT_TEMPLATES) {
      const result = renderPrompt(t.body, {}, snippetBodies);
      expect(result.text, t.key).not.toContain("{{");
      expect(result.text, t.key).not.toContain("[[");
      expect(result.text.length, t.key).toBeGreaterThan(40);
    }
  });

  it("nutzt in jeder Vorlage mindestens einen Platzhalter ihres Bezugs", () => {
    const contextual = DEFAULT_TEMPLATES.filter((t) => t.subject !== "NONE");
    for (const t of contextual) {
      const own = placeholdersFor(t.subject, t.withIdentities)
        .map((p) => p.key)
        .filter((key) => key.includes("."));
      const used = own.some((key) => t.body.includes(`{{${key}}}`));
      expect(used, `${t.key} zieht keine Daten aus seinem Bezug`).toBe(true);
    }
  });
});

describe("checkBody", () => {
  it("meldet einen vertippten Platzhalter", () => {
    const problems = checkBody("{{einsatz.statd}}", "MISSION", false, []);
    expect(problems.unknownPlaceholders).toEqual(["einsatz.statd"]);
  });

  it("meldet einen Platzhalter, der nicht zum Bezug gehört", () => {
    const problems = checkBody("{{depesche.titel}}", "MISSION", false, []);
    expect(problems.unknownPlaceholders).toEqual(["depesche.titel"]);
  });

  it("lässt Identitätsplatzhalter nur zu, wenn die Vorlage Identitäten einbezieht", () => {
    expect(checkBody("{{identitaet.farbe}}", "MISSION", false, []).unknownPlaceholders).toEqual([
      "identitaet.farbe",
    ]);
    expect(checkBody("{{identitaet.farbe}}", "MISSION", true, []).unknownPlaceholders).toEqual([]);
  });

  it("kennt Identitätsplatzhalter beim Bezug „Identität“ ohne Zusatzschalter", () => {
    expect(checkBody("{{identitaet.rolle}}", "IDENTITY", false, []).unknownPlaceholders).toEqual([]);
  });

  it("meldet einen Baustein, den es nicht gibt", () => {
    expect(checkBody("{{baustein.fehlt}}", "NONE", false, ["stil"]).unknownSnippets).toEqual([
      "fehlt",
    ]);
  });
});
