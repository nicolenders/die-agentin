import { describe, it, expect } from "vitest";
import { parseCsvParam, toggleCsv } from "./filters";

describe("parseCsvParam", () => {
  it("splits, trims, drops empties and duplicates", () => {
    expect(parseCsvParam("a,b,c")).toEqual(["a", "b", "c"]);
    expect(parseCsvParam(" a , b ,, a ")).toEqual(["a", "b"]);
    expect(parseCsvParam("")).toEqual([]);
    expect(parseCsvParam(undefined)).toEqual([]);
    expect(parseCsvParam(null)).toEqual([]);
  });
});

describe("toggleCsv", () => {
  it("adds when missing, removes when present", () => {
    expect(toggleCsv([], "x")).toEqual(["x"]);
    expect(toggleCsv(["x"], "x")).toEqual([]);
    expect(toggleCsv(["a", "b"], "c")).toEqual(["a", "b", "c"]);
    expect(toggleCsv(["a", "b"], "a")).toEqual(["b"]);
  });
});
