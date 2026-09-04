import { describe, it, expect } from "vitest";
import { FALLBACK_ASPECT, aspectRatio, justifyRows, targetRowHeight } from "./justified";

const LANDSCAPE = 3 / 2; // 1.5
const PORTRAIT = 2 / 3; // 0.667

/** Bilder als reine Seitenverhältnisse — mehr braucht das Layout nicht. */
const by = (a: number) => a;

describe("aspectRatio", () => {
  it("rechnet Breite durch Höhe", () => {
    expect(aspectRatio(3000, 2000)).toBeCloseTo(1.5);
    expect(aspectRatio(2000, 3000)).toBeCloseTo(0.667, 2);
  });

  it("fällt ohne Maße auf Querformat zurück", () => {
    expect(aspectRatio(undefined, undefined)).toBe(FALLBACK_ASPECT);
    expect(aspectRatio(0, 100)).toBe(FALLBACK_ASPECT);
    expect(aspectRatio(100, null)).toBe(FALLBACK_ASPECT);
  });

  it("deckelt Panoramen und extreme Hochformate", () => {
    expect(aspectRatio(6000, 1000)).toBe(3);
    expect(aspectRatio(1000, 6000)).toBe(0.5);
  });
});

describe("targetRowHeight", () => {
  it("wird am Telefon aus der Breite abgeleitet", () => {
    expect(targetRowHeight(360)).toBe(223);
  });

  it("ist am großen Bildschirm fest", () => {
    expect(targetRowHeight(600)).toBe(240);
    expect(targetRowHeight(900)).toBe(290);
  });
});

describe("justifyRows", () => {
  it("gibt für keine Bilder keine Zeile", () => {
    expect(justifyRows([], by, { containerWidth: 900, gap: 10 })).toEqual([]);
  });

  it("bricht am großen Bildschirm nach zwei bis drei Querformaten um", () => {
    const rows = justifyRows([LANDSCAPE, LANDSCAPE, LANDSCAPE, LANDSCAPE], by, {
      containerWidth: 900,
      gap: 10,
    });
    expect(rows.map((r) => r.items.length)).toEqual([2, 2]);
  });

  it("stellt am Telefon ein Querformat allein und zwei Hochformate nebeneinander", () => {
    const phone = { containerWidth: 360, gap: 8 };
    expect(justifyRows([LANDSCAPE, LANDSCAPE], by, phone).map((r) => r.items.length)).toEqual([1, 1]);
    expect(justifyRows([PORTRAIT, PORTRAIT], by, phone).map((r) => r.items.length)).toEqual([2]);
  });

  it("hält alle Bilder einer Zeile auf derselben Höhe, egal welches Format", () => {
    const [row] = justifyRows([PORTRAIT, LANDSCAPE, PORTRAIT], by, {
      containerWidth: 900,
      gap: 10,
      targetHeight: 290,
    });
    // Die Höhe folgt aus der Zeile, nicht aus dem einzelnen Bild: Summe der
    // Seitenverhältnisse mal Höhe plus Abstände ergibt wieder die Breite.
    const sum = PORTRAIT + LANDSCAPE + PORTRAIT;
    expect(row!.height * sum + 2 * 10).toBeCloseTo(900, 5);
  });

  it("verliert kein Bild und behält die Reihenfolge", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g"];
    const aspects: Record<string, number> = { a: 1.5, b: 0.667, c: 1.5, d: 1, e: 0.667, f: 2, g: 1.5 };
    const rows = justifyRows(items, (i) => aspects[i]!, { containerWidth: 820, gap: 12 });
    expect(rows.flatMap((r) => r.items)).toEqual(items);
  });

  it("hält die Zeilenhöhen nah beieinander — dafür ist die Aufteilung optimal", () => {
    // Genau die Mischung, die gierig aufgeteilt eine 223er neben eine 313er
    // Zeile setzte: erst drei Bilder gedrängt, dann drei luftig.
    const mixed = [PORTRAIT, 4 / 3, 16 / 9, PORTRAIT, 4 / 3, PORTRAIT, 4 / 3];
    const rows = justifyRows(mixed, by, { containerWidth: 880, gap: 10, targetHeight: 290 });
    const heights = rows.map((r) => r.height);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(60);
  });

  it("lässt kein einzelnes Bild als Waise am Ende stehen", () => {
    const mixed = [PORTRAIT, 4 / 3, 16 / 9, PORTRAIT, 4 / 3, PORTRAIT, 3, 4 / 3];
    const rows = justifyRows(mixed, by, { containerWidth: 880, gap: 10, targetHeight: 290 });
    expect(rows.at(-1)!.items.length).toBeGreaterThan(1);
  });

  it("füllt jede Zeile bis zur vollen Breite", () => {
    const mixed = [PORTRAIT, LANDSCAPE, PORTRAIT, LANDSCAPE, 1, LANDSCAPE];
    const rows = justifyRows(mixed, by, { containerWidth: 880, gap: 10, targetHeight: 290 });
    for (const row of rows) {
      expect(row.full).toBe(true);
      const sum = row.items.reduce((acc, a) => acc + a, 0);
      expect(row.height * sum + (row.items.length - 1) * 10).toBeCloseTo(880, 5);
    }
  });

  it("deckelt ein einzelnes Hochformat, statt es zur Wand zu ziehen", () => {
    const rows = justifyRows([PORTRAIT], by, { containerWidth: 880, gap: 10, targetHeight: 290 });
    expect(rows).toHaveLength(1);
    // Volle Breite ergäbe 1320 px Höhe — gedeckelt auf das 1,5-Fache der Zielhöhe.
    expect(rows[0]!.height).toBe(435);
    expect(rows[0]!.full).toBe(false);
  });

  it("streckt zwei Bilder, die ohnehin fast passen", () => {
    const rows = justifyRows([LANDSCAPE, LANDSCAPE], by, {
      containerWidth: 900,
      gap: 10,
      targetHeight: 290,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.full).toBe(true);
    expect(rows[0]!.height).toBeCloseTo(297, 0);
  });
});
