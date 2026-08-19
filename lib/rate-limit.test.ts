import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, __resetRateLimits, __bucketCount } from "./rate-limit";

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

describe("Speicherverbrauch", () => {
  it("räumt abgelaufene Einträge weg, statt unbegrenzt zu wachsen", () => {
    __resetRateLimits();
    // Mehr Schlüssel als die Obergrenze, alle im selben abgelaufenen Fenster.
    for (let i = 0; i < 12_000; i++) {
      rateLimit(`ip:${i}`, 5, 1000, 0);
    }
    // Ein Zugriff nach Ablauf des Fensters muss die Altlast abtragen.
    rateLimit("ip:neu", 5, 1000, 10_000);
    expect(__bucketCount()).toBeLessThanOrEqual(10_000);
  });

  it("bremst weiterhin korrekt, nachdem aufgeräumt wurde", () => {
    __resetRateLimits();
    for (let i = 0; i < 11_000; i++) rateLimit(`x:${i}`, 2, 1000, 0);
    expect(rateLimit("frisch", 2, 1000, 5000).ok).toBe(true);
    expect(rateLimit("frisch", 2, 1000, 5000).ok).toBe(true);
    expect(rateLimit("frisch", 2, 1000, 5000).ok).toBe(false);
  });
});
