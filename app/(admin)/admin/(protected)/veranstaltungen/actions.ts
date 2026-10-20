"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags, tags } from "@/lib/cache";
import { eventMatchKey } from "@/lib/events/naming";
import { findOrCreateSeries } from "@/lib/events/link";

// Stammdaten der Veranstaltungen. Geschrieben wird ausschließlich hier und in
// der Einsatzmaske; erste Zeile ist immer die Rollenprüfung.

const BACK = "/admin/veranstaltungen";

/** Die Namen der Veranstaltungen stehen an den öffentlichen Einsatzlisten. */
function invalidate(): void {
  invalidateTags([tags.missionList("de"), tags.missionList("en")]);
}

async function log(action: string, entityId: string, detail: string): Promise<void> {
  const user = await requireAdmin();
  await db.auditLog.create({
    data: {
      actor: user.email ?? user.oid ?? "admin",
      action,
      entity: "eventSeries",
      entityId,
      detail,
    },
  });
}

function parseDay(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00Z`) : null;
}

export async function createEventSeries(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !eventMatchKey(name)) redirect(`${BACK}?err=missing-fields`);

  let seriesId = "";
  let existed = false;
  try {
    const result = await findOrCreateSeries(name, {
      organizer: String(formData.get("organizer") ?? ""),
      websiteUrl: String(formData.get("websiteUrl") ?? ""),
    });
    seriesId = result.id;
    existed = !result.created;
  } catch {
    redirect(`${BACK}?err=failed`);
  }
  if (existed) redirect(`${BACK}?err=duplicate`);
  await log("eventSeries.create", seriesId, name);
  invalidate();
  redirect(`${BACK}?ok=created`);
}

export async function updateEventSeries(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const matchKey = eventMatchKey(name);
  if (!id || !name || !matchKey) redirect(`${BACK}?err=missing-fields`);

  // Ein Name, der auf denselben Vergleichsschlüssel führt wie eine andere
  // Veranstaltung, wäre eine Dublette. Das wird vorher gesagt, nicht als
  // Datenbankfehler.
  const clash = await db.eventSeries.findFirst({
    where: { matchKey, NOT: { id } },
    select: { id: true },
  });
  if (clash) redirect(`${BACK}?err=duplicate`);

  let failed = false;
  try {
    await db.eventSeries.update({
      where: { id },
      data: {
        name,
        matchKey,
        organizer: String(formData.get("organizer") ?? "").trim() || null,
        websiteUrl: String(formData.get("websiteUrl") ?? "").trim() || null,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${BACK}?err=failed`);
  await log("eventSeries.update", id, name);
  invalidate();
  redirect(`${BACK}?ok=saved`);
}

/**
 * Veranstaltung löschen. Die Einsätze bleiben — sie verlieren nur ihre
 * Zuordnung. Ihr eigener Veranstaltungsname und ihre Adresse stehen weiter am
 * Einsatz, es geht also nichts verloren.
 */
export async function deleteEventSeries(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect(`${BACK}?err=not-found`);

  let failed = false;
  try {
    await db.mission.updateMany({
      where: { eventSeriesId: id },
      data: { eventSeriesId: null, eventEditionId: null },
    });
    await db.eventSeries.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${BACK}?err=failed`);
  await log("eventSeries.delete", id, "gelöscht");
  invalidate();
  redirect(`${BACK}?ok=deleted`);
}

/**
 * Zwei Veranstaltungen zusammenführen. Der Gegenpart zur unscharfen
 * Namenserkennung: Was getrennt angelegt wurde, lässt sich wieder vereinen —
 * Einsätze und Ausgaben ziehen um, die Quelle verschwindet.
 */
export async function mergeEventSeries(formData: FormData): Promise<void> {
  await requireAdmin();
  const sourceId = String(formData.get("sourceId") ?? "").trim();
  const targetId = String(formData.get("targetId") ?? "").trim();
  if (!sourceId || !targetId) redirect(`${BACK}?err=missing-fields`);
  if (sourceId === targetId) redirect(`${BACK}?err=merge-self`);

  let failed = false;
  try {
    const [source, target] = await Promise.all([
      db.eventSeries.findUnique({ where: { id: sourceId }, include: { editions: true } }),
      db.eventSeries.findUnique({ where: { id: targetId }, include: { editions: true } }),
    ]);
    if (!source || !target) redirect(`${BACK}?err=not-found`);

    // Ausgaben umhängen. Gibt es die Bezeichnung am Ziel schon, wird die
    // umziehende umbenannt statt überschrieben — eine Chronik verliert keine
    // Zeile, nur weil zwei Veranstaltungen zusammenwachsen.
    const taken = new Set(target!.editions.map((e) => e.label));
    for (const edition of source!.editions) {
      let label = edition.label;
      let n = 2;
      while (taken.has(label)) label = `${edition.label} (${n++})`;
      taken.add(label);
      await db.eventEdition.update({
        where: { id: edition.id },
        data: { seriesId: targetId, label },
      });
    }
    await db.mission.updateMany({ where: { eventSeriesId: sourceId }, data: { eventSeriesId: targetId } });
    await db.eventSeries.delete({ where: { id: sourceId } });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    failed = true;
  }
  if (failed) redirect(`${BACK}?err=failed`);
  await log("eventSeries.merge", targetId, `Quelle ${sourceId}`);
  invalidate();
  redirect(`${BACK}?ok=merged`);
}

/** Ausgabe anlegen oder ändern — der Historieneintrag der Veranstaltung. */
export async function saveEventEdition(formData: FormData): Promise<void> {
  await requireAdmin();
  const seriesId = String(formData.get("seriesId") ?? "").trim();
  const editionId = String(formData.get("editionId") ?? "").trim();
  const startDate = parseDay(formData.get("startDate"));
  const endDate = parseDay(formData.get("endDate"));
  if (!seriesId || (!editionId && !startDate)) redirect(`${BACK}?err=missing-fields`);
  if (startDate && endDate && endDate < startDate) redirect(`${BACK}?err=edition-range`);

  const label = String(formData.get("label") ?? "").trim() ||
    (startDate ? String(startDate.getUTCFullYear()) : "");
  if (!label) redirect(`${BACK}?err=missing-fields`);

  let failed = false;
  try {
    if (editionId) {
      await db.eventEdition.updateMany({
        where: { id: editionId, seriesId },
        data: { label, startDate, endDate },
      });
    } else {
      await db.eventEdition.create({ data: { seriesId, label, startDate, endDate } });
    }
  } catch {
    failed = true;
  }
  if (failed) redirect(`${BACK}?err=edition-duplicate`);
  await log("eventSeries.edition", seriesId, label);
  invalidate();
  redirect(`${BACK}?ok=saved`);
}

/** Ausgabe löschen. Einsätze, die daran hingen, behalten ihre Veranstaltung. */
export async function deleteEventEdition(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect(`${BACK}?err=not-found`);

  let failed = false;
  try {
    await db.mission.updateMany({ where: { eventEditionId: id }, data: { eventEditionId: null } });
    await db.eventEdition.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${BACK}?err=failed`);
  invalidate();
  redirect(`${BACK}?ok=deleted`);
}
