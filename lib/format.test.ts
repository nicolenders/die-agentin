import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  isWorkshopDuration,
  WORKSHOP_MIN_MINUTES,
} from "./format";

// Audit 4.7: „420′" liest niemand als sieben Stunden. Ab 90 Minuten wird in
// Stunden ausgegeben, ab 180 Minuten gilt das Format als Workshop.
describe("formatDuration", () => {
  it("gibt kurze Vorträge in Minuten aus", () => {
    expect(formatDuration(30, "de")).toBe("30 Min.");
    expect(formatDuration(45, "de")).toBe("45 Min.");
    expect(formatDuration(60, "de")).toBe("60 Min.");
    expect(formatDuration(45, "en")).toBe("45 min");
  });

  it("rechnet ab 90 Minuten in Stunden um", () => {
    expect(formatDuration(120, "de")).toBe("2 Std.");
    expect(formatDuration(420, "de")).toBe("7 Std.");
    expect(formatDuration(420, "en")).toBe("7 h");
  });

  it("schreibt krumme Werte mit einer Nachkommastelle im Locale-Format", () => {
    expect(formatDuration(90, "de")).toBe("1,5 Std.");
    expect(formatDuration(90, "en")).toBe("1.5 h");
  });
});

describe("isWorkshopDuration", () => {
  it("erkennt Workshops ab der Schwelle", () => {
    expect(isWorkshopDuration(WORKSHOP_MIN_MINUTES)).toBe(true);
    expect(isWorkshopDuration(420)).toBe(true);
  });

  it("lässt Sessions unangetastet", () => {
    expect(isWorkshopDuration(60)).toBe(false);
    expect(isWorkshopDuration(120)).toBe(false);
  });

  it("kommt mit fehlender Angabe klar", () => {
    expect(isWorkshopDuration(null)).toBe(false);
    expect(isWorkshopDuration(undefined)).toBe(false);
  });
});

// Audit 6.8: `04/09/2026` liest ein US-Publikum als 9. April. Deutsch bleibt
// beim gewohnten Punktformat.
describe("formatDate", () => {
  // Genau der mehrdeutige Fall: 9. April, in Ziffern `09/04` — für US-Leser
  // der 4. September.
  const date = new Date("2026-04-09T10:00:00Z");

  it("schreibt DE mit Ziffern", () => {
    expect(formatDate(date, "de")).toBe("09.04.2026");
  });

  it("schreibt EN mit Monatskürzel", () => {
    expect(formatDate(date, "en")).toBe("09 Apr 2026");
  });

  it("lässt in EN keine rein numerische Schreibweise zu", () => {
    expect(formatDate(new Date("2026-09-04T10:00:00Z"), "en")).toMatch(/^04 Sept? 2026$/);
  });

  it("liefert für fehlende Werte einen leeren String", () => {
    expect(formatDate(null, "de")).toBe("");
    expect(formatDate("kein Datum", "en")).toBe("");
  });
});

describe("formatDateTime", () => {
  const date = new Date("2026-04-09T10:00:00Z");

  it("nutzt dasselbe Monatsformat wie formatDate", () => {
    expect(formatDateTime(date, "de")).toContain("09.04.2026");
    expect(formatDateTime(date, "en")).toContain("09 Apr 2026");
  });
});
