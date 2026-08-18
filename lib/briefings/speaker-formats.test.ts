import { describe, it, expect } from "vitest";
import { formatMinutesRange, languagesLabel, parseFormatLanguages } from "./speaker-formats";

describe("speaker-formats", () => {
  it("liest die Sprachkürzel in fester Reihenfolge", () => {
    expect(parseFormatLanguages("de,en")).toEqual(["de", "en"]);
    expect(parseFormatLanguages("EN, DE")).toEqual(["de", "en"]);
    expect(parseFormatLanguages("en")).toEqual(["en"]);
    expect(parseFormatLanguages("")).toEqual([]);
    expect(parseFormatLanguages(null)).toEqual([]);
    // Unbekannte Kürzel werden verworfen, statt in der Tabelle zu landen.
    expect(parseFormatLanguages("de,fr")).toEqual(["de"]);
  });

  it("beschriftet die Sprachen", () => {
    expect(languagesLabel(["de", "en"])).toBe("DE · EN");
    expect(languagesLabel(["en"])).toBe("EN");
    expect(languagesLabel([])).toBe("");
  });

  it("zeigt eine einzelne Dauer", () => {
    expect(formatMinutesRange(45, null, "de")).toBe("45 Min.");
    expect(formatMinutesRange(null, 45, "en")).toBe("45 min");
    expect(formatMinutesRange(60, 60, "de")).toBe("60 Min.");
  });

  it("zeigt einen Bereich und dreht vertauschte Grenzen", () => {
    expect(formatMinutesRange(45, 60, "de")).toBe("45 bis 60 Min.");
    expect(formatMinutesRange(60, 45, "en")).toBe("45 to 60 min");
  });

  it("nennt beide Einheiten, wenn der Bereich die Einheit wechselt", () => {
    expect(formatMinutesRange(45, 180, "de")).toBe("45 Min. bis 3 Std.");
    expect(formatMinutesRange(45, 180, "en")).toBe("45 min to 3 h");
  });

  it("bleibt ohne gepflegte Dauer leer", () => {
    expect(formatMinutesRange(null, null, "de")).toBe("");
    expect(formatMinutesRange(0, undefined, "de")).toBe("");
  });
});
