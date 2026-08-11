import { describe, it, expect } from "vitest";
import { antarcticaCoords, isOnlineEvent } from "./online";

describe("antarcticaCoords", () => {
  it("stays on the Antarctica ring and is deterministic", () => {
    for (let i = 0; i < 50; i++) {
      const c = antarcticaCoords(i);
      expect(c.lon).toBeGreaterThanOrEqual(-180);
      expect(c.lon).toBeLessThan(180);
      expect(c.lat).toBeLessThanOrEqual(-72);
      expect(c.lat).toBeGreaterThanOrEqual(-78);
      expect(c.countryCode).toBe("AQ");
      expect(c.city).toBe("Online");
    }
    expect(antarcticaCoords(7)).toEqual(antarcticaCoords(7));
  });
});

describe("isOnlineEvent", () => {
  it("detects AQ or 'Online'", () => {
    expect(isOnlineEvent("AQ", "Wien")).toBe(true);
    expect(isOnlineEvent("DE", "online")).toBe(true);
    expect(isOnlineEvent("DE", "Köln")).toBe(false);
    expect(isOnlineEvent(null, null)).toBe(false);
  });
});
