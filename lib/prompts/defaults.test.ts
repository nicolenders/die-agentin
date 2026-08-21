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

  it("gibt jeder Bildvorlage genau einen Stil-Baustein und die Verbotsliste", () => {
    const styles = snippetKeys.filter((k) => k.startsWith("stil-"));
    // Das Porträt zeigt bewusst ein Gesicht und kann die gemeinsame
    // Verbotsliste deshalb nicht anhängen; die übrigen Verbote stehen dort
    // ausgeschrieben im Vorlagentext.
    const ohneVerbotsliste = ["bild-portrait-marke"];
    for (const t of DEFAULT_TEMPLATES.filter((x) => x.kind === "IMAGE")) {
      const used = styles.filter((k) => t.body.includes(`{{baustein.${k}}}`));
      expect(used, `${t.key} braucht genau einen Stil-Baustein`).toHaveLength(1);
      if (ohneVerbotsliste.includes(t.key)) {
        expect(t.body, `${t.key} braucht wenigstens das Textverbot`).toContain("No text");
        continue;
      }
      expect(t.body, `${t.key} braucht die Verbotsliste`).toContain("{{baustein.verbote-bild}}");
    }
  });

  it("gibt jeder Textvorlage die Schreibstimme oder einen Grund, sie wegzulassen", () => {
    // Ausnahmen: Vorlagen, deren Ergebnis kein Fließtext in Nicoles Stimme ist,
    // sondern eine Zuordnung, eine Übertragung oder ein Alternativtext.
    const ohneStimme = [
      // Dritte Person: Veranstalter übernehmen Bios so, die Ich-Stimme passt nicht.
      "text-speaker-bio",
      "text-depesche-bildidee",
      "text-depesche-metadaten",
      "text-depesche-englisch",
      "text-briefing-englisch",
      "text-alternativtext",
    ];
    for (const t of DEFAULT_TEMPLATES.filter((x) => x.kind === "TEXT")) {
      if (ohneStimme.includes(t.key)) continue;
      expect(t.body, `${t.key} ohne Schreibstimme`).toContain("{{baustein.stimme}}");
    }
  });

  it("setzt im deutschen Vorlagentext keine Geviertstriche", () => {
    // Nicoles Stilregel gilt für ihre Texte — und ein Anweisungstext voller
    // Geviertstriche zieht das Modell dazu, im Ergebnis selbst welche zu
    // setzen. Bildprompts sind englisch und davon nicht betroffen.
    const deutsch = [
      ...DEFAULT_TEMPLATES.filter((t) => t.kind === "TEXT").map((t) => [t.key, t.body] as const),
      ...DEFAULT_SNIPPETS.filter((s) => !s.key.startsWith("stil-") && s.key !== "verbote-bild").map(
        (s) => [s.key, s.body] as const,
      ),
    ];
    for (const [key, body] of deutsch) {
      expect(body, `${key} enthält einen Geviertstrich`).not.toContain("—");
    }
  });

  it("bietet ein freies Eingabefeld genau dann an, wenn die Vorlage es nutzt", () => {
    for (const t of DEFAULT_TEMPLATES) {
      const usesInput = t.body.includes("{{eingabe}}");
      expect(Boolean(t.inputLabel), `${t.key}: Beschriftung und Nutzung passen nicht zusammen`).toBe(
        usesInput,
      );
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
