import { describe, it, expect } from "vitest";
import {
  parseStringList,
  serializeStringList,
  identityDisplayName,
  parseHex,
  contrastRatio,
  isAccentReadable,
  isValidHex,
} from "./identities";

describe("parseStringList / serializeStringList", () => {
  it("parses a JSON array and ignores non-strings", () => {
    expect(parseStringList('["a","b"]')).toEqual(["a", "b"]);
    expect(parseStringList('["a",1,null,"b"]')).toEqual(["a", "b"]);
  });
  it("returns [] for empty or invalid input", () => {
    expect(parseStringList(null)).toEqual([]);
    expect(parseStringList("")).toEqual([]);
    expect(parseStringList("not json")).toEqual([]);
    expect(parseStringList("{}")).toEqual([]);
  });
  it("round-trips and trims/drops blanks", () => {
    expect(serializeStringList([" a ", "", "b"])).toBe('["a","b"]');
    expect(parseStringList(serializeStringList(["x", "y"]))).toEqual(["x", "y"]);
  });
});

describe("identityDisplayName", () => {
  const base = { codenameDe: "", codenameEn: "", roleDe: "Rolle", roleEn: "Role" };
  it("falls back to role when codename is empty", () => {
    expect(identityDisplayName(base, "de")).toBe("Rolle");
    expect(identityDisplayName(base, "en")).toBe("Role");
  });
  it("prefers codename when present", () => {
    expect(identityDisplayName({ ...base, codenameDe: "Die Expertin" }, "de")).toBe("Die Expertin");
  });
  it("falls back to the other locale when the requested one is empty", () => {
    expect(identityDisplayName({ ...base, codenameDe: "Deckname", codenameEn: "" }, "en")).toBe("Deckname");
    expect(identityDisplayName({ codenameDe: "", codenameEn: "", roleDe: "", roleEn: "Role" }, "de")).toBe("Role");
  });
});

describe("hex + contrast", () => {
  it("parses #rgb and #rrggbb", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("8B5CF6")).toEqual([139, 92, 246]);
    expect(parseHex("#zzz")).toBeNull();
    expect(parseHex("12345")).toBeNull();
  });
  it("computes known contrast ratios", () => {
    // black vs white = 21:1
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    // identical colors = 1:1
    expect(contrastRatio("#123456", "#123456")).toBeCloseTo(1, 5);
    expect(contrastRatio("nope", "#fff")).toBeNull();
  });
  it("flags weak accents against the dark background", () => {
    // bright magenta reads well on near-black ink
    expect(isAccentReadable("#E879F9")).toBe(true);
    // a very dark navy does not
    expect(isAccentReadable("#0A0620")).toBe(false);
  });
  it("validates hex", () => {
    expect(isValidHex("#A855F7")).toBe(true);
    expect(isValidHex("nope")).toBe(false);
  });
});
