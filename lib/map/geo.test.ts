import { describe, it, expect } from "vitest";
import { computeGeo } from "./geo";

// Regressionstest: Kontinent-/DACH-Ansichten müssen tatsächlich hineinzoomen.
// Ein früherer Bug (falsche Ring-Wicklung im fit-Polygon) ließ fitExtent auf
// Weltmaßstab — EUROPA zeigte die ganze Welt, DACH war winzig.
describe("computeGeo Ansichten", () => {
  const W = 1000;
  const H = 500;
  const world = computeGeo(W, H, null);
  const europe = computeGeo(W, H, [
    [-25, 34],
    [45, 72],
  ]);
  const dach = computeGeo(
    W,
    H,
    [
      [5, 45.5],
      [17.5, 55.5],
    ],
    ["276", "040", "756"],
  );

  it("zoomt bei Europa deutlich näher als die Welt", () => {
    expect(europe.projection.scale()).toBeGreaterThan(world.projection.scale() * 2);
  });

  it("zoomt bei DACH noch näher als bei Europa", () => {
    expect(dach.projection.scale()).toBeGreaterThan(europe.projection.scale());
  });

  it("zeichnet für DACH nur die gewählten Länder (kürzerer Pfad als die Welt)", () => {
    expect(dach.landPath.length).toBeGreaterThan(0);
    expect(dach.landPath.length).toBeLessThan(world.landPath.length);
  });
});
