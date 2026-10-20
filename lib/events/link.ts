// Zuordnung eines Einsatzes zu einer Veranstaltung — die eine Stelle, an der
// aus der Eingabemaske Veranstaltung, Ausgabe und Stammdaten werden. Sie wird
// von der Einsatzmaske und vom Backfill-Skript gleichermaßen benutzt, damit
// beide dieselbe Regel anwenden.

import { db } from "@/lib/db";
import { editionLabel, eventMatchKey, eventSlugBase } from "./naming";

/** Wert der Ausgabe-Auswahl, der „neue Ausgabe anlegen" bedeutet. */
export const NEW_EDITION = "neu";

export interface EventLinkInput {
  /** Bestehende Veranstaltung; leer heißt „keine Zuordnung". */
  seriesId?: string | null;
  /** Neu anzulegende Veranstaltung. Hat Vorrang vor `seriesId`. */
  newSeriesName?: string | null;
  newSeriesOrganizer?: string | null;
  /** Adresse, wie sie am Einsatz steht. */
  websiteUrl?: string | null;
  /**
   * Die Adresse zusätzlich in die Stammdaten schreiben. Wirkt nur nach vorn:
   * bereits erfasste Einsätze behalten ihre eigene Adresse.
   */
  syncWebsite?: boolean;
  /** Bestehende Ausgabe, `NEW_EDITION` für eine neue, leer für keine. */
  editionId?: string | null;
  editionStart?: Date | null;
  editionEnd?: Date | null;
}

export interface EventLinkResult {
  eventSeriesId: string | null;
  eventEditionId: string | null;
}

const NONE: EventLinkResult = { eventSeriesId: null, eventEditionId: null };

/** Freier Slug für eine neue Veranstaltung. */
async function uniqueSeriesSlug(name: string): Promise<string> {
  const base = eventSlugBase(name);
  let candidate = base;
  let n = 1;
  while (await db.eventSeries.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

/**
 * Veranstaltung anlegen oder die vorhandene mit demselben normalisierten Namen
 * zurückgeben. Doppelte Veranstaltungen entstehen so gar nicht erst — „TechDay
 * 2026" trifft den bestehenden „TechDay".
 */
export async function findOrCreateSeries(
  name: string,
  extra?: { organizer?: string | null; websiteUrl?: string | null },
): Promise<{ id: string; created: boolean }> {
  const trimmed = name.trim();
  const matchKey = eventMatchKey(trimmed);
  if (!trimmed || !matchKey) throw new Error("Name der Veranstaltung fehlt.");

  const existing = await db.eventSeries.findUnique({ where: { matchKey }, select: { id: true } });
  if (existing) return { id: existing.id, created: false };

  const created = await db.eventSeries.create({
    data: {
      name: trimmed,
      matchKey,
      slug: await uniqueSeriesSlug(trimmed),
      organizer: extra?.organizer?.trim() || null,
      websiteUrl: extra?.websiteUrl?.trim() || null,
    },
    select: { id: true },
  });
  return { id: created.id, created: true };
}

/**
 * Aus der Eingabe der Einsatzmaske die beiden Fremdschlüssel des Einsatzes
 * machen — und dabei Stammdaten und Ausgabe der Veranstaltung nachziehen.
 */
export async function resolveEventLink(input: EventLinkInput): Promise<EventLinkResult> {
  const seriesId = await resolveSeries(input);
  if (!seriesId) return NONE;

  // Stammdatenpflege aus dem Einsatz heraus: nur vorwärts und nur, wenn wirklich
  // etwas dasteht. Ein leer geräumtes Feld löscht keine Stammdaten — dafür gibt
  // es die Veranstaltungsmaske.
  const website = input.websiteUrl?.trim();
  if (input.syncWebsite && website) {
    await db.eventSeries.updateMany({
      where: { id: seriesId, NOT: { websiteUrl: website } },
      data: { websiteUrl: website },
    });
  }

  const eventEditionId = await resolveEdition(seriesId, input);
  return { eventSeriesId: seriesId, eventEditionId };
}

async function resolveSeries(input: EventLinkInput): Promise<string | null> {
  const newName = input.newSeriesName?.trim();
  if (newName) {
    const { id } = await findOrCreateSeries(newName, {
      organizer: input.newSeriesOrganizer,
      websiteUrl: input.websiteUrl,
    });
    return id;
  }
  const id = input.seriesId?.trim();
  if (!id) return null;
  const found = await db.eventSeries.findUnique({ where: { id }, select: { id: true } });
  return found?.id ?? null;
}

async function resolveEdition(seriesId: string, input: EventLinkInput): Promise<string | null> {
  const wanted = input.editionId?.trim() ?? "";
  const start = input.editionStart ?? null;
  const end = input.editionEnd ?? null;

  // Bestehende Ausgabe: Sie gehört der Veranstaltung, deshalb wandern die Daten
  // in den gemeinsamen Eintrag — genau das ist ihr Zweck.
  if (wanted && wanted !== NEW_EDITION) {
    const edition = await db.eventEdition.findFirst({
      where: { id: wanted, seriesId },
      select: { id: true },
    });
    if (edition) {
      await db.eventEdition.update({
        where: { id: edition.id },
        data: { startDate: start, endDate: end },
      });
      return edition.id;
    }
    return null;
  }

  // Neue Ausgabe entsteht nur, wenn auch ein Datum dasteht: eine Ausgabe ohne
  // Zeitraum ist kein Historieneintrag, sondern eine leere Zeile.
  if (wanted !== NEW_EDITION || !start) return null;

  const taken = await db.eventEdition.findMany({ where: { seriesId }, select: { label: true } });
  const created = await db.eventEdition.create({
    data: {
      seriesId,
      label: editionLabel(start, taken.map((e) => e.label)),
      startDate: start,
      endDate: end,
    },
    select: { id: true },
  });
  return created.id;
}
