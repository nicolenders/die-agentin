import { describe, it, expect } from "vitest";
import { berlinLocalToUtc, berlinOffsetMinutes, utcToBerlinLocal } from "./time";

describe("time (Europe/Berlin ↔ UTC)", () => {
  it("berücksichtigt Sommerzeit (+2h im August)", () => {
    // 08:00 Berliner Wanduhrzeit im August = 06:00 UTC
    const utc = berlinLocalToUtc("2026-08-02T08:00");
    expect(utc?.toISOString()).toBe("2026-08-02T06:00:00.000Z");
  });

  it("berücksichtigt Winterzeit (+1h im Januar)", () => {
    // 08:00 Berliner Wanduhrzeit im Januar = 07:00 UTC
    const utc = berlinLocalToUtc("2026-01-02T08:00");
    expect(utc?.toISOString()).toBe("2026-01-02T07:00:00.000Z");
  });

  it("liefert den korrekten Offset", () => {
    expect(berlinOffsetMinutes(new Date("2026-08-02T06:00:00Z"))).toBe(120);
    expect(berlinOffsetMinutes(new Date("2026-01-02T07:00:00Z"))).toBe(60);
  });

  it("rundreist UTC → Berlin-Local → UTC", () => {
    const local = utcToBerlinLocal(new Date("2026-08-02T06:00:00Z"));
    expect(local).toBe("2026-08-02T08:00");
    expect(berlinLocalToUtc(local)?.toISOString()).toBe("2026-08-02T06:00:00.000Z");
  });

  it("gibt null bei leerer Eingabe", () => {
    expect(berlinLocalToUtc("")).toBeNull();
    expect(berlinLocalToUtc(undefined)).toBeNull();
  });
});
