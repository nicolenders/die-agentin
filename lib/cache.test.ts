import { describe, it, expect } from "vitest";
import { reviveDates } from "./cache";

describe("reviveDates", () => {
  it("konvertiert ISO-Zeitstempel-Strings in Date", () => {
    const revived = reviveDates<unknown>("2026-08-08T00:00:00.000Z");
    expect(revived).toBeInstanceOf(Date);
    expect((revived as Date).getUTCFullYear()).toBe(2026);
  });

  it("lässt Nicht-Datums-Strings unangetastet (Slugs, Titel, JSON)", () => {
    expect(reviveDates("agenten-in-produktion")).toBe("agenten-in-produktion");
    expect(reviveDates("2026-08-08")).toBe("2026-08-08"); // reines Datum ohne Zeit
    expect(reviveDates('{"type":"doc"}')).toBe('{"type":"doc"}');
  });

  it("behält echte Date-Objekte", () => {
    const d = new Date("2026-01-01T12:00:00.000Z");
    expect(reviveDates(d)).toBe(d);
  });

  it("rehydriert verschachtelte Objekte und Arrays", () => {
    const input = {
      id: "1",
      startDate: "2026-08-08T10:30:00.000Z",
      title: "Test",
      count: 3,
      active: true,
      photos: [{ url: "/a.webp", createdAt: "2025-12-31T23:59:59.000Z" }],
      nothing: null,
    };
    const out = reviveDates(input);
    expect(out.startDate).toBeInstanceOf(Date);
    expect(out.title).toBe("Test");
    expect(out.count).toBe(3);
    expect(out.active).toBe(true);
    expect(out.photos[0]!.createdAt).toBeInstanceOf(Date);
    expect(out.photos[0]!.url).toBe("/a.webp");
    expect(out.nothing).toBeNull();
  });

  it("lässt Primitive unverändert", () => {
    expect(reviveDates(42)).toBe(42);
    expect(reviveDates(null)).toBeNull();
    expect(reviveDates(undefined)).toBeUndefined();
  });
});
