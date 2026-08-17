import { describe, it, expect } from "vitest";
import {
  availableMissionYears,
  countVisitedCountries,
  isUpcoming,
  parseYearSelection,
  matchesYear,
} from "./missions";

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

describe("isUpcoming", () => {
  const today = "2026-08-17";

  it("zählt den heutigen Einsatz dazu", () => {
    // Der eigentliche Punkt: ein Einsatz, der heute läuft, ist nicht vorbei —
    // auch wenn sein Zeitstempel (Mitternacht UTC) längst hinter uns liegt.
    expect(isUpcoming(today, today)).toBe(true);
  });

  it("nimmt Späteres an und Früheres nicht", () => {
    expect(isUpcoming("2026-08-18", today)).toBe(true);
    expect(isUpcoming("2027-01-01", today)).toBe(true);
    expect(isUpcoming("2026-08-16", today)).toBe(false);
    expect(isUpcoming("2019-12-31", today)).toBe(false);
  });

  it("vergleicht über Monats- und Jahresgrenzen richtig", () => {
    expect(isUpcoming("2026-09-01", "2026-08-31")).toBe(true);
    expect(isUpcoming("2026-12-31", "2027-01-01")).toBe(false);
  });
});

// Audit 4.10: Die Kennzahl „Länder" steht auf dem HQ und im Speaker-Kit.
// Online-Einsätze tragen den synthetischen Ländercode „AQ" (Antarktis) aus
// `lib/import/online.ts` und dürfen sie nicht erhöhen.
describe("countVisitedCountries", () => {
  const onSite = (countryCode: string) => ({ countryCode, isOnline: false });

  it("zählt jedes Land genau einmal", () => {
    expect(countVisitedCountries([onSite("DE"), onSite("DE"), onSite("NL"), onSite("US")])).toBe(3);
  });

  it("lässt Online-Einsätze außen vor", () => {
    const missions = [onSite("DE"), { countryCode: "AQ", isOnline: true }];
    expect(countVisitedCountries(missions)).toBe(1);
  });

  it("lässt den Antarktis-Code auch ohne isOnline-Flag außen vor", () => {
    // Altbestand aus dem Import: Koordinaten gesetzt, Flag nicht gepflegt.
    expect(countVisitedCountries([onSite("DE"), onSite("AQ")])).toBe(1);
  });

  it("ignoriert leere und unterschiedlich geschriebene Codes", () => {
    expect(countVisitedCountries([onSite("de"), onSite("DE"), onSite(""), { countryCode: null }])).toBe(1);
  });

  it("liefert 0 ohne Einsätze", () => {
    expect(countVisitedCountries([])).toBe(0);
  });
});
