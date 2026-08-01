import { describe, it, expect } from "vitest";
import { extractTexts, applyTexts } from "./extract";
import {
  buildNumberedInput,
  parseNumberedOutput,
  buildTranslationSystemPrompt,
  glossaryTerms,
} from "./glossary";
import type { TiptapDoc } from "@/lib/content/schema";

const doc: TiptapDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Titel" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Hallo " },
        { type: "text", text: "Welt", marks: [{ type: "bold" }] },
      ],
    },
  ],
};

describe("translate/extract", () => {
  it("extrahiert Texte in Reihenfolge", () => {
    expect(extractTexts(doc)).toEqual(["Titel", "Hallo ", "Welt"]);
  });

  it("schreibt Übersetzungen strukturgleich zurück", () => {
    const out = applyTexts(doc, ["Title", "Hello ", "World"]);
    expect(extractTexts(out)).toEqual(["Title", "Hello ", "World"]);
    // Marks/Struktur bleiben erhalten
    expect(out.content[1]?.content?.[1]?.marks?.[0]?.type).toBe("bold");
  });

  it("behält Originaltext, wenn Übersetzung fehlt", () => {
    const out = applyTexts(doc, ["Title"]);
    expect(extractTexts(out)).toEqual(["Title", "Hallo ", "Welt"]);
  });
});

describe("translate/glossary", () => {
  it("nummeriert die Eingabe", () => {
    expect(buildNumberedInput(["a", "b"])).toBe("1. a\n2. b");
  });

  it("parst nummerierte Ausgabe zurück", () => {
    expect(parseNumberedOutput("1. A\n2. B", 2)).toEqual(["A", "B"]);
  });

  it("füllt fehlende Zeilen mit leerem String", () => {
    expect(parseNumberedOutput("2. B", 2)).toEqual(["", "B"]);
  });

  it("nennt Glossarbegriffe im System-Prompt", () => {
    const prompt = buildTranslationSystemPrompt("de", "en");
    expect(prompt).toContain("Copilot Studio");
    expect(prompt).toContain("English");
    expect(glossaryTerms().length).toBeGreaterThan(0);
  });
});
