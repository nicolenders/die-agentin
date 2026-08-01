import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, __resetRateLimits } from "./rate-limit";

describe("rate-limit", () => {
  beforeEach(() => __resetRateLimits());

  it("erlaubt bis zum Limit und blockt dann", () => {
    const t = 1000;
    expect(rateLimit("k", 3, 60_000, t).ok).toBe(true);
    expect(rateLimit("k", 3, 60_000, t).ok).toBe(true);
    expect(rateLimit("k", 3, 60_000, t).ok).toBe(true);
    const blocked = rateLimit("k", 3, 60_000, t);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("setzt das Fenster nach Ablauf zurück", () => {
    expect(rateLimit("k", 1, 1000, 0).ok).toBe(true);
    expect(rateLimit("k", 1, 1000, 500).ok).toBe(false);
    expect(rateLimit("k", 1, 1000, 1001).ok).toBe(true);
  });

  it("trennt Schlüssel", () => {
    expect(rateLimit("a", 1, 1000, 0).ok).toBe(true);
    expect(rateLimit("b", 1, 1000, 0).ok).toBe(true);
    expect(rateLimit("a", 1, 1000, 0).ok).toBe(false);
  });
});
