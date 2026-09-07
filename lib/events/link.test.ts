import { beforeEach, describe, expect, it, vi } from "vitest";

// Die Zuordnung eines Einsatzes zu einer Veranstaltung ist die Stelle, an der
// zwei Versprechen eingelöst werden: Es entsteht keine doppelte Veranstaltung,
// und eine geänderte Adresse wandert in die Stammdaten, ohne alte Einsätze
// anzufassen. Beides wird hier gegen eine kleine Attrappe der Datenbank geprüft.

interface FakeSeries {
  id: string;
  name: string;
  matchKey: string;
  slug: string;
  organizer: string | null;
  websiteUrl: string | null;
}
interface FakeEdition {
  id: string;
  seriesId: string;
  label: string;
  startDate: Date | null;
  endDate: Date | null;
}

const series: FakeSeries[] = [];
const editions: FakeEdition[] = [];
let sequence = 0;

vi.mock("@/lib/db", () => ({
  db: {
    eventSeries: {
      findUnique: async ({ where }: { where: { id?: string; slug?: string; matchKey?: string } }) =>
        series.find(
          (s) =>
            (where.id !== undefined && s.id === where.id) ||
            (where.slug !== undefined && s.slug === where.slug) ||
            (where.matchKey !== undefined && s.matchKey === where.matchKey),
        ) ?? null,
      create: async ({ data }: { data: Omit<FakeSeries, "id"> }) => {
        const created = { id: `series-${++sequence}`, ...data };
        series.push(created);
        return created;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; NOT?: { websiteUrl: string } };
        data: { websiteUrl: string };
      }) => {
        const found = series.filter(
          (s) => s.id === where.id && (!where.NOT || s.websiteUrl !== where.NOT.websiteUrl),
        );
        for (const s of found) s.websiteUrl = data.websiteUrl;
        return { count: found.length };
      },
    },
    eventEdition: {
      findFirst: async ({ where }: { where: { id: string; seriesId: string } }) =>
        editions.find((e) => e.id === where.id && e.seriesId === where.seriesId) ?? null,
      findMany: async ({ where }: { where: { seriesId: string } }) =>
        editions.filter((e) => e.seriesId === where.seriesId),
      create: async ({ data }: { data: Omit<FakeEdition, "id"> }) => {
        const created = { id: `edition-${++sequence}`, ...data };
        editions.push(created);
        return created;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { startDate: Date | null; endDate: Date | null };
      }) => {
        const found = editions.find((e) => e.id === where.id)!;
        Object.assign(found, data);
        return found;
      },
    },
  },
}));

const { NEW_EDITION, resolveEventLink } = await import("./link");

beforeEach(() => {
  series.length = 0;
  editions.length = 0;
  sequence = 0;
});

describe("resolveEventLink", () => {
  it("ordnet ohne Veranstaltung gar nichts zu", async () => {
    const result = await resolveEventLink({ seriesId: "", editionId: NEW_EDITION });
    expect(result).toEqual({ eventSeriesId: null, eventEditionId: null });
    expect(editions).toHaveLength(0);
  });

  it("legt eine neue Veranstaltung an — mit Adresse aus dem Einsatz", async () => {
    const result = await resolveEventLink({
      newSeriesName: "TechDay 2026",
      newSeriesOrganizer: "Community e. V.",
      websiteUrl: "https://techday.example/2026",
    });
    expect(result.eventSeriesId).toBe("series-1");
    expect(series[0]).toMatchObject({
      name: "TechDay 2026",
      matchKey: "techday",
      organizer: "Community e. V.",
      websiteUrl: "https://techday.example/2026",
    });
  });

  it("trifft die vorhandene Veranstaltung statt eine zweite anzulegen", async () => {
    await resolveEventLink({ newSeriesName: "TechDay 2025" });
    await resolveEventLink({ newSeriesName: "TechDay 2026" });
    expect(series).toHaveLength(1);
  });

  it("schreibt die geänderte Adresse in die Stammdaten, wenn das gewünscht ist", async () => {
    const { eventSeriesId } = await resolveEventLink({
      newSeriesName: "TechDay",
      websiteUrl: "https://alt.example",
    });
    await resolveEventLink({
      seriesId: eventSeriesId,
      websiteUrl: "https://neu.example",
      syncWebsite: true,
    });
    expect(series[0]?.websiteUrl).toBe("https://neu.example");
  });

  it("lässt die Stammdaten in Ruhe, wenn der Haken nicht gesetzt ist", async () => {
    const { eventSeriesId } = await resolveEventLink({
      newSeriesName: "TechDay",
      websiteUrl: "https://alt.example",
    });
    await resolveEventLink({ seriesId: eventSeriesId, websiteUrl: "https://neu.example" });
    expect(series[0]?.websiteUrl).toBe("https://alt.example");
  });

  it("löscht die Stammdaten nicht, wenn das Feld im Einsatz leer bleibt", async () => {
    const { eventSeriesId } = await resolveEventLink({
      newSeriesName: "TechDay",
      websiteUrl: "https://alt.example",
    });
    await resolveEventLink({ seriesId: eventSeriesId, websiteUrl: "", syncWebsite: true });
    expect(series[0]?.websiteUrl).toBe("https://alt.example");
  });

  it("legt eine Ausgabe mit dem Jahr als Bezeichnung an", async () => {
    const { eventSeriesId } = await resolveEventLink({ newSeriesName: "TechDay" });
    const result = await resolveEventLink({
      seriesId: eventSeriesId,
      editionId: NEW_EDITION,
      editionStart: new Date("2026-03-12T00:00:00Z"),
      editionEnd: new Date("2026-03-14T00:00:00Z"),
    });
    expect(result.eventEditionId).toBe(editions[0]?.id);
    expect(editions[0]).toMatchObject({ label: "2026" });
  });

  it("legt keine Ausgabe ohne Zeitraum an", async () => {
    const { eventSeriesId } = await resolveEventLink({ newSeriesName: "TechDay" });
    const result = await resolveEventLink({ seriesId: eventSeriesId, editionId: NEW_EDITION });
    expect(result.eventEditionId).toBeNull();
    expect(editions).toHaveLength(0);
  });

  it("schreibt den Zeitraum in die gemeinsame Ausgabe, statt sie zu verdoppeln", async () => {
    const { eventSeriesId } = await resolveEventLink({ newSeriesName: "TechDay" });
    const first = await resolveEventLink({
      seriesId: eventSeriesId,
      editionId: NEW_EDITION,
      editionStart: new Date("2026-03-12T00:00:00Z"),
    });
    const second = await resolveEventLink({
      seriesId: eventSeriesId,
      editionId: first.eventEditionId,
      editionStart: new Date("2026-03-12T00:00:00Z"),
      editionEnd: new Date("2026-03-14T00:00:00Z"),
    });
    expect(second.eventEditionId).toBe(first.eventEditionId);
    expect(editions).toHaveLength(1);
    expect(editions[0]?.endDate).toEqual(new Date("2026-03-14T00:00:00Z"));
  });

  it("nimmt keine Ausgabe einer fremden Veranstaltung an", async () => {
    const a = await resolveEventLink({ newSeriesName: "TechDay" });
    const b = await resolveEventLink({ newSeriesName: "Cloud Summit" });
    const edition = await resolveEventLink({
      seriesId: a.eventSeriesId,
      editionId: NEW_EDITION,
      editionStart: new Date("2026-03-12T00:00:00Z"),
    });
    const result = await resolveEventLink({
      seriesId: b.eventSeriesId,
      editionId: edition.eventEditionId,
    });
    expect(result.eventEditionId).toBeNull();
  });
});
