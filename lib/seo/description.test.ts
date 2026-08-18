import { describe, it, expect } from "vitest";
import {
  META_DESCRIPTION_MAX,
  firstSentence,
  metaDescription,
  truncateAtWord,
} from "./description";

describe("firstSentence", () => {
  it("liefert den ersten Satz", () => {
    expect(firstSentence("Vom Chatbot zum handelnden System. Und weiter.")).toBe(
      "Vom Chatbot zum handelnden System.",
    );
  });

  it("liefert den ganzen Text, wenn kein Satzende vorkommt", () => {
    expect(firstSentence("Ohne Punkt am Ende")).toBe("Ohne Punkt am Ende");
  });

  it("bricht nicht an Abkürzungen ab", () => {
    expect(firstSentence("Werkzeuge, z. B. Copilot Studio, im Einsatz. Danach mehr.")).toBe(
      "Werkzeuge, z. B. Copilot Studio, im Einsatz.",
    );
  });

  it("normalisiert Whitespace", () => {
    expect(firstSentence("  Ein   Satz\nmit Umbruch. Zweiter.")).toBe("Ein Satz mit Umbruch.");
  });

  it("kommt mit leerem Text klar", () => {
    expect(firstSentence("   ")).toBe("");
  });
});

describe("truncateAtWord", () => {
  it("lässt kurze Texte unverändert und hängt keine Ellipse an", () => {
    const short = "Kurze Beschreibung.";
    expect(truncateAtWord(short)).toBe(short);
  });

  it("kürzt an der letzten Wortgrenze und bleibt im Limit", () => {
    const long = "Wort ".repeat(60).trim();
    const result = truncateAtWord(long);
    expect(result.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toContain("Wor…");
  });

  it("lässt kein Satzzeichen vor der Ellipse stehen", () => {
    const result = truncateAtWord("Ein Satz, der viel zu lang ist, um hineinzupassen.", 11);
    expect(result).toBe("Ein Satz…");
  });
});

describe("metaDescription", () => {
  it("setzt Bausteine zusammen und überspringt leere", () => {
    expect(metaDescription("Tagline.", null, "Erster Satz.")).toBe("Tagline. Erster Satz.");
  });

  it("gibt undefined zurück, wenn nichts übrig bleibt", () => {
    expect(metaDescription(null, undefined, "  ")).toBeUndefined();
  });

  it("hält die 155-Zeichen-Grenze ein", () => {
    const result = metaDescription("Lange Beschreibung ".repeat(20));
    expect(result?.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
  });
});
