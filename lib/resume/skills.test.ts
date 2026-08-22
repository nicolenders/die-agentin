import { describe, expect, it } from "vitest";
import { computeSkillYears, effectiveSkillYears, parsePeriod, skillLevelLabel } from "./skills";

const now = new Date("2026-06-15T00:00:00Z");

describe("parsePeriod", () => {
  it("liest Monat/Jahr in beiden gebräuchlichen Schreibweisen", () => {
    expect(parsePeriod("03/2018")).toEqual({ year: 2018, month: 2 });
    expect(parsePeriod("3.2018")).toEqual({ year: 2018, month: 2 });
    expect(parsePeriod("2018-03")).toEqual({ year: 2018, month: 2 });
  });

  it("liest ein blankes Jahr als Januar", () => {
    expect(parsePeriod("2018")).toEqual({ year: 2018, month: 0 });
  });

  it("erkennt offene Enden in beiden Sprachen", () => {
    expect(parsePeriod("heute")).toBe("open");
    expect(parsePeriod("Present")).toBe("open");
  });

  it("gibt bei Unlesbarem null zurück", () => {
    expect(parsePeriod("irgendwann")).toBeNull();
    expect(parsePeriod("")).toBeNull();
    expect(parsePeriod(null)).toBeNull();
  });
});

describe("computeSkillYears", () => {
  it("rechnet bis heute, wenn das Ende offen ist", () => {
    expect(computeSkillYears("03/2018", "heute", now)).toBe(8);
    expect(computeSkillYears("03/2018", "", now)).toBe(8);
  });

  it("rechnet zwischen zwei festen Angaben", () => {
    expect(computeSkillYears("01/2020", "01/2023", now)).toBe(3);
  });

  it("rundet halbe Jahre auf das nächste volle", () => {
    expect(computeSkillYears("01/2020", "07/2020", now)).toBe(1);
    expect(computeSkillYears("01/2020", "04/2020", now)).toBe(0);
  });

  it("gibt null zurück, wenn der Start unlesbar ist oder das Ende davor liegt", () => {
    expect(computeSkillYears("irgendwann", "heute", now)).toBeNull();
    expect(computeSkillYears("01/2020", "01/2018", now)).toBeNull();
  });
});

describe("effectiveSkillYears", () => {
  it("bevorzugt den berechneten Wert", () => {
    expect(effectiveSkillYears({ periodFrom: "01/2020", periodTo: "01/2023", skillYears: 99 }, now)).toBe(3);
  });

  it("nimmt die manuelle Eingabe, wenn nichts zu rechnen ist", () => {
    expect(effectiveSkillYears({ periodFrom: null, periodTo: null, skillYears: 4 }, now)).toBe(4);
  });

  it("bleibt ohne beides leer", () => {
    expect(effectiveSkillYears({ periodFrom: null, periodTo: null, skillYears: null }, now)).toBeNull();
  });
});

describe("skillLevelLabel", () => {
  it("übersetzt die Stufen", () => {
    expect(skillLevelLabel("EXPERT")).toBe("Experte");
    expect(skillLevelLabel("THEORY", "en")).toBe("Theoretical knowledge");
  });

  it("gibt bei unbekannten Werten nichts aus", () => {
    expect(skillLevelLabel("GURU")).toBeNull();
    expect(skillLevelLabel(null)).toBeNull();
  });
});
