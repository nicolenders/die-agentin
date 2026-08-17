import { describe, it, expect } from "vitest";
import { sortBriefings } from "./sort";

const item = (title: string, total: number, sortOrder = 0) => ({ title, total, sortOrder });

describe("sortBriefings", () => {
  it("stellt das meistgehaltene Briefing nach oben", () => {
    const sorted = sortBriefings(
      [item("Selten", 1), item("Oft", 18), item("Mittel", 5)],
      "de",
    );
    expect(sorted.map((i) => i.title)).toEqual(["Oft", "Mittel", "Selten"]);
  });

  it("lässt sich von der manuellen Reihenfolge nicht überstimmen", () => {
    // Der Fall aus dem Audit: `reorderTalk` hat allen Briefings eine laufende
    // Nummer gegeben, die nichts mit der Häufigkeit zu tun hat.
    const sorted = sortBriefings(
      [item("Drei", 3, 0), item("Fünf", 5, 1), item("Eins", 1, 2)],
      "de",
    );
    expect(sorted.map((i) => i.title)).toEqual(["Fünf", "Drei", "Eins"]);
  });

  it("nutzt die manuelle Reihenfolge bei gleicher Häufigkeit", () => {
    const sorted = sortBriefings(
      [item("B", 0, 2), item("A", 0, 1), item("C", 0, 0)],
      "de",
    );
    expect(sorted.map((i) => i.title)).toEqual(["C", "A", "B"]);
  });

  it("fällt bei Gleichstand auf den Titel zurück", () => {
    const sorted = sortBriefings([item("Zebra", 2), item("Ähre", 2), item("Anker", 2)], "de");
    expect(sorted.map((i) => i.title)).toEqual(["Ähre", "Anker", "Zebra"]);
  });

  it("verändert die übergebene Liste nicht", () => {
    const input = [item("A", 1), item("B", 9)];
    sortBriefings(input, "de");
    expect(input.map((i) => i.title)).toEqual(["A", "B"]);
  });
});
