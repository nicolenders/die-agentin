import { describe, it, expect } from "vitest";
import {
  DURATION_UNITS,
  durationUnitLabel,
  formatDurationRange,
  languagesLabel,
  parseFormatLanguages,
  toDurationUnit,
} from "./speaker-formats";

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
});

describe("Dauer-Einheit", () => {
  it("normalisiert gespeicherte Werte", () => {
    expect(toDurationUnit("HOURS")).toBe("HOURS");
    expect(toDurationUnit("days")).toBe("DAYS");
    expect(toDurationUnit(" minutes ")).toBe("MINUTES");
    // Altbestand ohne Einheit und Unsinn landen bei Minuten.
    expect(toDurationUnit(null)).toBe("MINUTES");
    expect(toDurationUnit("")).toBe("MINUTES");
    expect(toDurationUnit("WOCHEN")).toBe("MINUTES");
  });

  it("kennt für jede Einheit beide Sprachen", () => {
    for (const unit of DURATION_UNITS) {
      for (const locale of ["de", "en"] as const) {
        expect(durationUnitLabel(unit, 1, locale)).not.toBe("");
        expect(durationUnitLabel(unit, 2, locale)).not.toBe("");
      }
    }
  });

  it("setzt die Mehrzahl nur bei Tagen", () => {
    expect(durationUnitLabel("DAYS", 1, "de")).toBe("Tag");
    expect(durationUnitLabel("DAYS", 2, "de")).toBe("Tage");
    expect(durationUnitLabel("DAYS", 1, "en")).toBe("day");
    expect(durationUnitLabel("DAYS", 2, "en")).toBe("days");
    expect(durationUnitLabel("MINUTES", 1, "de")).toBe("Min.");
    expect(durationUnitLabel("MINUTES", 45, "de")).toBe("Min.");
    expect(durationUnitLabel("HOURS", 3, "de")).toBe("Std.");
    expect(durationUnitLabel("HOURS", 3, "en")).toBe("h");
  });
});

describe("formatDurationRange", () => {
  it("zeigt eine einzelne Dauer in der gewählten Einheit", () => {
    expect(formatDurationRange(45, null, "MINUTES", "de")).toBe("45 Min.");
    expect(formatDurationRange(null, 45, "MINUTES", "en")).toBe("45 min");
    expect(formatDurationRange(3, 3, "HOURS", "de")).toBe("3 Std.");
    expect(formatDurationRange(1, null, "DAYS", "de")).toBe("1 Tag");
    expect(formatDurationRange(2, null, "DAYS", "en")).toBe("2 days");
  });

  it("zeigt einen Bereich mit der Einheit nur am Ende", () => {
    expect(formatDurationRange(45, 60, "MINUTES", "de")).toBe("45 bis 60 Min.");
    expect(formatDurationRange(45, 60, "MINUTES", "en")).toBe("45 to 60 min");
    expect(formatDurationRange(2, 3, "HOURS", "de")).toBe("2 bis 3 Std.");
    expect(formatDurationRange(1, 2, "DAYS", "de")).toBe("1 bis 2 Tage");
    expect(formatDurationRange(1, 2, "DAYS", "en")).toBe("1 to 2 days");
  });

  it("dreht vertauschte Grenzen", () => {
    expect(formatDurationRange(60, 45, "MINUTES", "de")).toBe("45 bis 60 Min.");
    expect(formatDurationRange(3, 1, "DAYS", "de")).toBe("1 bis 3 Tage");
  });

  it("rechnet nicht in eine andere Einheit um", () => {
    // Wer 180 Minuten pflegt, meint Minuten. Für „3 Std." gibt es die Einheit.
    expect(formatDurationRange(180, null, "MINUTES", "de")).toBe("180 Min.");
    expect(formatDurationRange(180, null, "MINUTES", "en")).toBe("180 min");
  });

  it("bleibt ohne gepflegte Dauer leer", () => {
    expect(formatDurationRange(null, null, "MINUTES", "de")).toBe("");
    expect(formatDurationRange(0, undefined, "DAYS", "de")).toBe("");
  });
});
