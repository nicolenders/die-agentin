import { describe, it, expect } from "vitest";
import { inBounds, availableViews, matchesView, MAP_VIEWS } from "./views";

// Referenzkoordinaten für die Tests.
const WIEN = { lon: 16.37, lat: 48.21 }; // Österreich → in Europa und DACH
const PARIS = { lon: 2.35, lat: 48.85 }; // Europa, aber außerhalb DACH
const NEW_YORK = { lon: -74.0, lat: 40.71 };
const SYDNEY = { lon: 151.2, lat: -33.87 };
const BERLIN = { lon: 13.4, lat: 52.52 };

const europa = MAP_VIEWS.find((v) => v.id === "europa")!;
const nordamerika = MAP_VIEWS.find((v) => v.id === "nordamerika")!;
const dach = MAP_VIEWS.find((v) => v.id === "dach")!;

describe("inBounds", () => {
  it("null-Bounds (Welt) umfasst jeden Punkt", () => {
    expect(inBounds(null, NEW_YORK.lon, NEW_YORK.lat)).toBe(true);
    expect(inBounds(null, SYDNEY.lon, SYDNEY.lat)).toBe(true);
  });

  it("erkennt Punkte innerhalb einer Region", () => {
    expect(inBounds(europa.bounds, WIEN.lon, WIEN.lat)).toBe(true);
    expect(inBounds(nordamerika.bounds, NEW_YORK.lon, NEW_YORK.lat)).toBe(true);
    expect(inBounds(dach.bounds, BERLIN.lon, BERLIN.lat)).toBe(true);
  });

  it("erkennt Punkte außerhalb einer Region", () => {
    expect(inBounds(europa.bounds, NEW_YORK.lon, NEW_YORK.lat)).toBe(false);
    expect(inBounds(dach.bounds, PARIS.lon, PARIS.lat)).toBe(false); // Paris liegt außerhalb DACH
    expect(inBounds(nordamerika.bounds, SYDNEY.lon, SYDNEY.lat)).toBe(false);
  });
});

describe("availableViews", () => {
  it("bietet ohne Einsätze nur die Immer-Ansichten (Welt, DACH)", () => {
    const ids = availableViews([]).map((v) => v.id);
    expect(ids).toEqual(["welt", "dach"]);
  });

  it("blendet besuchte Kontinente ein, unbesuchte aus", () => {
    const ids = availableViews([WIEN, NEW_YORK]).map((v) => v.id);
    expect(ids).toContain("europa");
    expect(ids).toContain("nordamerika");
    expect(ids).not.toContain("ozeanien");
    expect(ids).not.toContain("asien");
  });

  it("behält die Reihenfolge aus MAP_VIEWS bei", () => {
    const views = availableViews([NEW_YORK, WIEN, SYDNEY]);
    const order = views.map((v) => v.id);
    expect(order.indexOf("welt")).toBeLessThan(order.indexOf("europa"));
    expect(order.indexOf("europa")).toBeLessThan(order.indexOf("nordamerika"));
    expect(order[order.length - 1]).toBe("dach");
  });

  it("Welt und DACH sind immer enthalten", () => {
    const ids = availableViews([SYDNEY]).map((v) => v.id);
    expect(ids).toContain("welt");
    expect(ids).toContain("dach");
    expect(ids).toContain("ozeanien");
  });
});

describe("matchesView", () => {
  const welt = MAP_VIEWS.find((v) => v.id === "welt")!;
  // Prag liegt im DACH-Rechteck, gehört aber nicht zu DE/AT/CH.
  const PRAG = { lon: 14.42, lat: 50.09, countryCode: "CZ" };

  it("lässt ohne Ansicht alles durch", () => {
    expect(matchesView(null, { ...PRAG })).toBe(true);
    expect(matchesView(welt, { ...PRAG })).toBe(true);
  });

  it("prüft das Rechteck", () => {
    expect(matchesView(europa, { ...WIEN, countryCode: "AT" })).toBe(true);
    expect(matchesView(europa, { ...NEW_YORK, countryCode: "US" })).toBe(false);
  });

  it("prüft bei DACH zusätzlich das Land", () => {
    expect(matchesView(dach, { ...BERLIN, countryCode: "DE" })).toBe(true);
    expect(matchesView(dach, { ...WIEN, countryCode: "AT" })).toBe(true);
    expect(matchesView(dach, PRAG)).toBe(false);
  });

  it("nimmt das Länderkürzel unabhängig von der Schreibweise", () => {
    expect(matchesView(dach, { ...BERLIN, countryCode: "de" })).toBe(true);
  });

  it("wertet ein fehlendes Länderkürzel als „nicht in DACH“", () => {
    expect(matchesView(dach, { ...BERLIN, countryCode: null })).toBe(false);
  });
});
