import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

// Die öffentliche Einsatzliste darf nicht leer werden, nur weil die Migration
// für Veranstaltungen in Produktion fehlt (ADR 0035). Geprüft gegen eine
// Attrappe, die beim ersten Zugriff wie SQL Server ohne die neuen Spalten
// antwortet.

const findMany = vi.fn();

vi.mock("@/lib/db", () => ({ db: { mission: { findMany: (...args: unknown[]) => findMany(...args) } } }));
// Ohne Next-Laufzeit: Cache einfach durchreichen.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: () => {},
}));

const { getMissions } = await import("./missions");

const row = {
  id: "m1",
  eventName: "TechDay",
  city: "Köln",
  countryCode: "DE",
  lat: 50.9,
  lon: 6.9,
  isOnline: false,
  startDate: new Date("2025-05-01T00:00:00Z"),
  status: "DONE",
  eventUrl: null,
  contentStatus: "PUBLISHED",
  caseFilePublic: true,
  sessionLanguage: "de",
  durationMin: 45,
  translations: [{ locale: "de", slug: "techday-2025", eventText: "", talkText: "" }],
  banner: null,
  identities: [],
  tools: [],
  deliveries: [],
};

function missingColumn() {
  return new Prisma.PrismaClientKnownRequestError("Invalid column name 'eventSeriesId'.", {
    code: "P2022",
    clientVersion: "test",
  });
}

describe("getMissions", () => {
  beforeEach(() => {
    findMany.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("loads missions with their event when the schema is complete", async () => {
    findMany.mockResolvedValueOnce([{ ...row, eventSeries: { id: "s1", slug: "techday", name: "TechDay" } }]);
    const missions = await getMissions("de");
    expect(missions).toHaveLength(1);
    expect(missions[0]?.series).toEqual({ id: "s1", slug: "techday", name: "TechDay" });
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it("falls back to missions without event when the event columns are missing", async () => {
    findMany.mockRejectedValueOnce(missingColumn()).mockResolvedValueOnce([row]);
    const missions = await getMissions("de");
    expect(missions).toHaveLength(1);
    expect(missions[0]?.series).toBeNull();
    const fallbackArgs = findMany.mock.calls[1]?.[0];
    expect(fallbackArgs.omit).toEqual({ eventSeriesId: true, eventEditionId: true });
    expect(fallbackArgs.include.eventSeries).toBeUndefined();
  });

  it("does not mask other failures as a missing schema, but logs them", async () => {
    findMany.mockRejectedValueOnce(new Error("timeout"));
    const missions = await getMissions("de");
    expect(missions).toEqual([]);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalled();
  });
});
