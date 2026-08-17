import { describe, it, expect } from "vitest";
import { formatDuration, isWorkshopDuration, WORKSHOP_MIN_MINUTES } from "./format";

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
