import { describe, it, expect } from "vitest";
import { expiryState, daysUntil } from "./expiry";

const now = new Date("2026-08-01T00:00:00Z");

describe("channels/expiry", () => {
  it("meldet 'none' ohne Ablaufdatum", () => {
    expect(expiryState(null, now)).toBe("none");
  });

  it("meldet 'ok' bei fernem Ablauf", () => {
    expect(expiryState(new Date("2026-09-01T00:00:00Z"), now)).toBe("ok");
  });

  it("warnt innerhalb von 14 Tagen", () => {
    expect(expiryState(new Date("2026-08-09T00:00:00Z"), now)).toBe("warn");
  });

  it("meldet 'expired' bei überschrittenem Datum", () => {
    expect(expiryState(new Date("2026-07-31T00:00:00Z"), now)).toBe("expired");
  });

  it("berechnet Tage bis Ablauf", () => {
    expect(daysUntil(new Date("2026-08-09T00:00:00Z"), now)).toBe(8);
    expect(daysUntil(null, now)).toBeNull();
  });
});
