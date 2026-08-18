import { describe, it, expect } from "vitest";
import {
  dispatchDate,
  dispatchYear,
  dispatchYears,
  matchesDispatchSearch,
  matchesDispatchYear,
  parseDispatchYear,
  type DispatchFilterable,
} from "./filter";

const base: DispatchFilterable = {
  format: "NOTE",
  title: "Artikel 50 gilt. Auch für deinen Agenten.",
  summary: "Der Digital Omnibus hat die Hochrisiko-Pflichten verschoben.",
  topics: ["EU AI Act"],
  identities: [{ name: "Die Archivarin" }],
  publishedAt: new Date("2026-06-17T09:00:00Z"),
  reviewedAt: null,
};

describe("dispatchDate", () => {
  it("nimmt bei Nachschlagewerken die letzte Prüfung", () => {
    const d = { ...base, format: "REFERENCE", reviewedAt: new Date("2026-09-02T09:00:00Z") };
    expect(dispatchDate(d)).toEqual(new Date("2026-09-02T09:00:00Z"));
  });

  it("nimmt sonst die Veröffentlichung", () => {
    expect(dispatchDate(base)).toEqual(base.publishedAt);
    // Nachschlagewerk ohne Prüfdatum: die Veröffentlichung bleibt gültig.
    expect(dispatchDate({ ...base, format: "REFERENCE" })).toEqual(base.publishedAt);
  });
});

describe("dispatchYear", () => {
  it("liest das Jahr aus dem angezeigten Datum", () => {
    expect(dispatchYear(base)).toBe(2026);
  });

  it("rechnet in Berliner Zeit, nicht in UTC", () => {
    // 31.12.2026 23:30 UTC ist in Berlin bereits der 1.1.2027.
    const d = { ...base, publishedAt: new Date("2026-12-31T23:30:00Z") };
    expect(dispatchYear(d)).toBe(2027);
  });

  it("liefert null ohne Datum", () => {
    expect(dispatchYear({ ...base, publishedAt: null })).toBeNull();
  });
});

describe("dispatchYears", () => {
  it("zählt jedes Jahr einmal, neueste zuerst", () => {
    const list = [
      base,
      { ...base, publishedAt: new Date("2025-03-01T09:00:00Z") },
      { ...base, publishedAt: new Date("2026-01-05T09:00:00Z") },
      { ...base, publishedAt: null },
    ];
    expect(dispatchYears(list)).toEqual([2026, 2025]);
  });

  it("liefert nichts für eine leere Liste", () => {
    expect(dispatchYears([])).toEqual([]);
  });
});

describe("matchesDispatchYear", () => {
  it("lässt ohne Auswahl alles durch", () => {
    expect(matchesDispatchYear(base, null)).toBe(true);
  });

  it("vergleicht auf das Jahr", () => {
    expect(matchesDispatchYear(base, 2026)).toBe(true);
    expect(matchesDispatchYear(base, 2025)).toBe(false);
  });
});

describe("matchesDispatchSearch", () => {
  it("lässt einen leeren Suchbegriff alles durch", () => {
    expect(matchesDispatchSearch(base, "")).toBe(true);
    expect(matchesDispatchSearch(base, "   ")).toBe(true);
  });

  it("sucht im Titel, unabhängig von Groß- und Kleinschreibung", () => {
    expect(matchesDispatchSearch(base, "AGENTEN")).toBe(true);
  });

  it("sucht auch in Zusammenfassung, Themen und Identitäten", () => {
    expect(matchesDispatchSearch(base, "omnibus")).toBe(true);
    expect(matchesDispatchSearch(base, "ai act")).toBe(true);
    expect(matchesDispatchSearch(base, "archivarin")).toBe(true);
  });

  it("findet nichts, was nicht da ist", () => {
    expect(matchesDispatchSearch(base, "kubernetes")).toBe(false);
  });

  it("verträgt eine fehlende Zusammenfassung", () => {
    expect(matchesDispatchSearch({ ...base, summary: null }, "artikel")).toBe(true);
  });
});

describe("parseDispatchYear", () => {
  it("nimmt eine Jahreszahl an", () => {
    expect(parseDispatchYear("2026")).toBe(2026);
  });

  it("weist Unfug als „kein Filter“ ab", () => {
    for (const raw of ["", null, undefined, "abc", "20", "99999", "2026.5"]) {
      expect(parseDispatchYear(raw)).toBeNull();
    }
  });
});
