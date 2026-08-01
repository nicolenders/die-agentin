import { describe, it, expect } from "vitest";
import { pickTranslation } from "./pick";

const de = { locale: "de", title: "DE" };
const en = { locale: "en", title: "EN" };

describe("content/pick", () => {
  it("wählt die gewünschte Sprache ohne Fallback", () => {
    const r = pickTranslation([de, en], "en");
    expect(r?.translation.title).toBe("EN");
    expect(r?.fallback).toBe(false);
    expect(r?.contentLocale).toBe("en");
  });

  it("fällt auf DE zurück, wenn EN fehlt — mit Hinweis", () => {
    const r = pickTranslation([de], "en");
    expect(r?.translation.title).toBe("DE");
    expect(r?.fallback).toBe(true);
    expect(r?.contentLocale).toBe("de");
  });

  it("DE-Anfrage auf DE ist kein Fallback", () => {
    const r = pickTranslation([de], "de");
    expect(r?.fallback).toBe(false);
  });

  it("gibt null zurück, wenn keine Übersetzung existiert", () => {
    expect(pickTranslation([], "de")).toBeNull();
  });
});
