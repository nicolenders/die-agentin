import { describe, it, expect, afterEach } from "vitest";
import {
  parseAdminObjectIds,
  isAdminObjectId,
  isAdmin,
} from "./allowlist";

describe("auth/allowlist", () => {
  describe("parseAdminObjectIds", () => {
    it("liefert leere Liste bei fehlendem Wert", () => {
      expect(parseAdminObjectIds(undefined)).toEqual([]);
      expect(parseAdminObjectIds(null)).toEqual([]);
      expect(parseAdminObjectIds("")).toEqual([]);
    });

    it("trennt an Kommas und trimmt", () => {
      expect(parseAdminObjectIds(" a , b ,c ")).toEqual(["a", "b", "c"]);
    });

    it("verwirft leere Einträge", () => {
      expect(parseAdminObjectIds("a,,b,")).toEqual(["a", "b"]);
    });
  });

  describe("isAdminObjectId", () => {
    const list = ["11111111-1111-1111-1111-111111111111"];

    it("erkennt eine gelistete ID (case-insensitive)", () => {
      expect(isAdminObjectId(list[0], list)).toBe(true);
      expect(isAdminObjectId(list[0]?.toUpperCase(), list)).toBe(true);
    });

    it("weist unbekannte oder fehlende IDs ab", () => {
      expect(isAdminObjectId("22222222-2222-2222-2222-222222222222", list)).toBe(false);
      expect(isAdminObjectId(undefined, list)).toBe(false);
      expect(isAdminObjectId("anything", [])).toBe(false);
    });
  });

  describe("isAdmin (gegen Umgebung)", () => {
    const original = process.env.ADMIN_OBJECT_IDS;
    afterEach(() => {
      process.env.ADMIN_OBJECT_IDS = original;
    });

    it("liest die Allow-List aus der Umgebung", () => {
      process.env.ADMIN_OBJECT_IDS = "abc,def";
      expect(isAdmin("abc")).toBe(true);
      expect(isAdmin("xyz")).toBe(false);
    });

    it("ist ohne Allow-List für niemanden Admin", () => {
      delete process.env.ADMIN_OBJECT_IDS;
      expect(isAdmin("abc")).toBe(false);
    });
  });
});
