import { describe, it, expect } from "vitest";
import { availableMissionYears, parseYearSelection, matchesYear } from "./missions";

describe("availableMissionYears", () => {
  it("dedupes and sorts descending", () => {
    expect(availableMissionYears([2024, 2026, 2024, 2025])).toEqual([2026, 2025, 2024]);
  });
});

describe("parseYearSelection", () => {
  it("defaults to 'aktuell'", () => {
    expect(parseYearSelection(undefined)).toBe("aktuell");
    expect(parseYearSelection("")).toBe("aktuell");
    expect(parseYearSelection("bad")).toBe("aktuell");
  });
  it("parses 'alle' and years", () => {
    expect(parseYearSelection("alle")).toBe("alle");
    expect(parseYearSelection("2026")).toBe(2026);
  });
});

describe("matchesYear", () => {
  const cur = 2026;
  it("'alle' matches everything", () => {
    expect(matchesYear(2019, false, "alle", cur)).toBe(true);
  });
  it("'aktuell' matches current year and future", () => {
    expect(matchesYear(2026, false, "aktuell", cur)).toBe(true);
    expect(matchesYear(2027, true, "aktuell", cur)).toBe(true);
    expect(matchesYear(2025, false, "aktuell", cur)).toBe(false);
  });
  it("a specific year matches only that year", () => {
    expect(matchesYear(2024, false, 2024, cur)).toBe(true);
    expect(matchesYear(2025, false, 2024, cur)).toBe(false);
  });
});
