import { describe, it, expect } from "vitest";
import { talkFormatOf, talkFormats } from "./formats";

describe("talkFormatOf", () => {
  it("ordnet die vorkommenden Dauern zu", () => {
    expect(talkFormatOf(30)).toBe("LIGHTNING");
    expect(talkFormatOf(45)).toBe("SESSION");
    expect(talkFormatOf(60)).toBe("LONG_SESSION");
    expect(talkFormatOf(420)).toBe("WORKSHOP");
  });

  it("zieht die Grenzen dort, wo `isWorkshopDuration` sie zieht", () => {
    expect(talkFormatOf(179)).toBe("LONG_SESSION");
    expect(talkFormatOf(180)).toBe("WORKSHOP");
  });
});

describe("talkFormats", () => {
  it("gruppiert Dauern und hält sie aufsteigend", () => {
    expect(talkFormats([60, 45, 420, 45, 30, 90])).toEqual([
      { format: "LIGHTNING", minutes: [30] },
      { format: "SESSION", minutes: [45] },
      { format: "LONG_SESSION", minutes: [60, 90] },
      { format: "WORKSHOP", minutes: [420] },
    ]);
  });

  it("führt kein Format ohne Briefing auf", () => {
    expect(talkFormats([45]).map((g) => g.format)).toEqual(["SESSION"]);
  });

  it("ignoriert fehlende und unsinnige Angaben", () => {
    expect(talkFormats([null, undefined, 0, -30])).toEqual([]);
  });
});
