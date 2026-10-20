import { db } from "@/lib/db";

// Lesezugriffe auf die Veranstaltungen. Sie stehen ausschließlich im
// Adminbereich (Stammdatenpflege und Einsatzmaske) — öffentlich erscheint eine
// Veranstaltung nur als Name an ihren Einsätzen, deshalb kein Cache-Tag.

export interface EventEditionRow {
  id: string;
  label: string;
  startDate: Date | null;
  endDate: Date | null;
  missionCount: number;
}

export interface EventSeriesRow {
  id: string;
  name: string;
  slug: string;
  organizer: string | null;
  websiteUrl: string | null;
  missionCount: number;
  /** Jüngster Einsatz bei dieser Veranstaltung — die Liste sortiert danach. */
  lastMissionAt: Date | null;
  editions: EventEditionRow[];
}

/** Alle Veranstaltungen mit Ausgaben und Einsatzzahlen — für /admin/veranstaltungen. */
export async function listEventSeries(): Promise<EventSeriesRow[]> {
  const rows = await db.eventSeries.findMany({
    orderBy: { name: "asc" },
    include: {
      editions: { orderBy: [{ startDate: "desc" }, { label: "desc" }] },
      missions: { select: { startDate: true, eventEditionId: true } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    organizer: s.organizer,
    websiteUrl: s.websiteUrl,
    missionCount: s.missions.length,
    lastMissionAt: s.missions.reduce<Date | null>(
      (max, m) => (!max || m.startDate > max ? m.startDate : max),
      null,
    ),
    editions: s.editions.map((e) => ({
      id: e.id,
      label: e.label,
      startDate: e.startDate,
      endDate: e.endDate,
      missionCount: s.missions.filter((m) => m.eventEditionId === e.id).length,
    })),
  }));
}

export interface EventSeriesOption {
  id: string;
  name: string;
  organizer: string | null;
  websiteUrl: string | null;
  editions: { id: string; label: string; startDate: string; endDate: string }[];
}

/**
 * Auswahlliste für die Einsatzmaske. Datumsangaben kommen als `YYYY-MM-DD`,
 * weil sie dort in Datumsfelder laufen.
 */
export async function listEventSeriesOptions(): Promise<EventSeriesOption[]> {
  const rows = await db.eventSeries.findMany({
    orderBy: { name: "asc" },
    include: { editions: { orderBy: [{ startDate: "desc" }, { label: "desc" }] } },
  });
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    organizer: s.organizer,
    websiteUrl: s.websiteUrl,
    editions: s.editions.map((e) => ({
      id: e.id,
      label: e.label,
      startDate: day(e.startDate),
      endDate: day(e.endDate),
    })),
  }));
}

function day(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}
