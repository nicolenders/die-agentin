import { describe, it, expect } from "vitest";
import { locationKey, missionsAtSameLocation, stepIndex } from "./location-group";

interface M {
  id: string;
  lat: number;
  lon: number;
  startDay: string;
}

const koeln = { lat: 50.9375, lon: 6.9603 };
const berlin = { lat: 52.52, lon: 13.405 };

const missions: M[] = [
  { id: "a", ...koeln, startDay: "2024-05-14" },
  { id: "b", ...berlin, startDay: "2025-03-02" },
  // Gleicher Ort wie „a", nur ein paar Meter daneben eingetragen.
  { id: "c", lat: 50.9378, lon: 6.9601, startDay: "2026-02-10" },
  { id: "d", ...koeln, startDay: "2023-11-01" },
];

describe("locationKey", () => {
  it("fasst Koordinaten innerhalb weniger hundert Meter zusammen", () => {
    expect(locationKey(50.9375, 6.9603)).toBe(locationKey(50.9378, 6.9601));
  });

  it("trennt verschiedene Städte", () => {
    expect(locationKey(koeln.lat, koeln.lon)).not.toBe(locationKey(berlin.lat, berlin.lon));
  });

  it("behandelt -0 und 0 als denselben Ort", () => {
    expect(locationKey(-0, -0)).toBe(locationKey(0, 0));
  });
});

describe("missionsAtSameLocation", () => {
  it("liefert alle Einsätze am Ort, neuester zuerst", () => {
    expect(missionsAtSameLocation(missions, "a").map((m) => m.id)).toEqual(["c", "a", "d"]);
  });

  it("liefert bei einem einzelnen Einsatz nur diesen", () => {
    expect(missionsAtSameLocation(missions, "b").map((m) => m.id)).toEqual(["b"]);
  });

  it("ist unabhängig davon, welcher Einsatz des Ortes gewählt wurde", () => {
    expect(missionsAtSameLocation(missions, "d")).toEqual(missionsAtSameLocation(missions, "c"));
  });

  it("liefert nichts für eine unbekannte Id", () => {
    expect(missionsAtSameLocation(missions, "gibt-es-nicht")).toEqual([]);
  });

  it("sortiert bei gleichem Datum stabil nach Id", () => {
    const gleich: M[] = [
      { id: "z", ...koeln, startDay: "2025-01-01" },
      { id: "y", ...koeln, startDay: "2025-01-01" },
    ];
    expect(missionsAtSameLocation(gleich, "z").map((m) => m.id)).toEqual(["y", "z"]);
  });
});

describe("stepIndex", () => {
  it("läuft vorwärts über das Ende hinaus wieder auf den Anfang", () => {
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(0, 1, 3)).toBe(1);
  });

  it("läuft rückwärts vom Anfang auf das Ende", () => {
    expect(stepIndex(0, -1, 3)).toBe(2);
    expect(stepIndex(2, -1, 3)).toBe(1);
  });

  it("bleibt bei leerer Liste bei 0", () => {
    expect(stepIndex(0, 1, 0)).toBe(0);
  });
});
