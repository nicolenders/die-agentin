import { describe, it, expect } from "vitest";
import { filterSightings, groupByYear, sightingFacets } from "./sightings";

const items = [
  { year: 2025, publisher: "Cloud Community" },
  { year: 2025, publisher: "MVP-Treff" },
  { year: 2024, publisher: "Cloud Community" },
  { year: 2023, publisher: null },
];

describe("sightingFacets", () => {
  it("zählt je Jahr und sortiert das Jüngste nach vorn", () => {
    expect(sightingFacets(items).years).toEqual([
      { value: 2025, count: 2 },
      { value: 2024, count: 1 },
      { value: 2023, count: 1 },
    ]);
  });

  it("zählt je Kanal, alphabetisch", () => {
    expect(sightingFacets(items).channels).toEqual([
      { value: "Cloud Community", count: 2 },
      { value: "MVP-Treff", count: 1 },
    ]);
  });

  it("macht aus einem fehlenden Kanal keine eigene Gruppe", () => {
    expect(sightingFacets(items).channels.some((c) => !c.value)).toBe(false);
  });

  it("kommt mit leerer Liste zurecht", () => {
    expect(sightingFacets([])).toEqual({ years: [], channels: [] });
  });
});

describe("filterSightings", () => {
  it("ohne Filter bleibt alles stehen", () => {
    expect(filterSightings(items, {})).toHaveLength(4);
    expect(filterSightings(items, { year: "", channel: "" })).toHaveLength(4);
  });

  it("filtert nach Jahr", () => {
    expect(filterSightings(items, { year: "2025" })).toHaveLength(2);
  });

  it("filtert nach Kanal", () => {
    expect(filterSightings(items, { channel: "Cloud Community" })).toHaveLength(2);
  });

  it("kombiniert beides", () => {
    expect(filterSightings(items, { year: "2025", channel: "Cloud Community" })).toHaveLength(1);
  });

  it('behandelt ein unsinniges Jahr als „alle“, nicht als „keine“', () => {
    expect(filterSightings(items, { year: "bald" })).toHaveLength(4);
  });

  it("liefert nichts, wenn es zur Auswahl nichts gibt", () => {
    expect(filterSightings(items, { year: "1999" })).toHaveLength(0);
  });
});

describe("groupByYear", () => {
  it("bündelt je Jahrgang, das jüngste zuerst", () => {
    const groups = groupByYear(items);
    expect(groups.map((g) => g.year)).toEqual([2025, 2024, 2023]);
    expect(groups[0]?.items).toHaveLength(2);
  });

  it("behält innerhalb eines Jahres die Reihenfolge bei", () => {
    const a = { year: 2025, publisher: "A" };
    const b = { year: 2025, publisher: "B" };
    expect(groupByYear([a, b])[0]?.items).toEqual([a, b]);
  });

  it("findet auch wieder zusammen, was in der Liste auseinanderliegt", () => {
    const groups = groupByYear([
      { year: 2025, publisher: "A" },
      { year: 2024, publisher: "B" },
      { year: 2025, publisher: "C" },
    ]);
    expect(groups.map((g) => [g.year, g.items.length])).toEqual([
      [2025, 2],
      [2024, 1],
    ]);
  });

  it("kommt mit leerer Liste zurecht", () => {
    expect(groupByYear([])).toEqual([]);
  });
});
