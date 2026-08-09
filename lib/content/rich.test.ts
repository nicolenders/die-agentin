import { describe, it, expect } from "vitest";
import { parseRichValue, richValueToPlain, isRichEmpty, serializeRichValue } from "./rich";

const doc = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("parseRichValue", () => {
  it("verpackt Plain-Text als Absätze (keine Migration nötig)", () => {
    const result = parseRichValue("Zeile eins\n\nZeile zwei");
    expect(result.type).toBe("doc");
    expect(result.content).toHaveLength(2);
    expect(richValueToPlain(JSON.stringify(result))).toBe("Zeile eins Zeile zwei");
  });

  it("liest bestehendes TipTap-JSON und bereinigt es", () => {
    const result = parseRichValue(JSON.stringify(doc("Hallo")));
    expect(richValueToPlain(JSON.stringify(result))).toBe("Hallo");
  });

  it("verwirft unbekannte Node-Typen im field-Kontext", () => {
    const withImage = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Text" }] },
        { type: "image", attrs: { assetId: "x" } },
      ],
    };
    const result = parseRichValue(JSON.stringify(withImage));
    // Bild ist im field-Kontext nicht erlaubt → verworfen, Absatz bleibt.
    expect(result.content.some((n) => n.type === "image")).toBe(false);
    expect(result.content.some((n) => n.type === "paragraph")).toBe(true);
  });

  it("leerer/undefinierter Wert ergibt ein leeres Dokument", () => {
    expect(parseRichValue(undefined).content).toHaveLength(0);
    expect(parseRichValue("").content).toHaveLength(0);
  });
});

describe("richValueToPlain", () => {
  it("gibt Plain-Text unverändert (getrimmt) zurück", () => {
    expect(richValueToPlain("  einfacher Text ")).toBe("einfacher Text");
  });
});

describe("isRichEmpty", () => {
  it("erkennt leere Werte und leere Dokumente", () => {
    expect(isRichEmpty("")).toBe(true);
    expect(isRichEmpty(null)).toBe(true);
    expect(isRichEmpty(JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }))).toBe(true);
    expect(isRichEmpty("Text")).toBe(false);
  });
});

describe("serializeRichValue", () => {
  it("gibt leeren String für leere Eingabe zurück", () => {
    expect(serializeRichValue("")).toBe("");
    expect(serializeRichValue(JSON.stringify({ type: "doc", content: [] }))).toBe("");
  });

  it("serialisiert nicht-leeren Inhalt als JSON-Dokument", () => {
    const out = serializeRichValue(JSON.stringify(doc("Inhalt")));
    expect(out.startsWith("{")).toBe(true);
    expect(richValueToPlain(out)).toBe("Inhalt");
  });
});
