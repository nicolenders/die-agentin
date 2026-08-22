"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { missionReportComplete } from "@/lib/queries/planning";

// Aufgabe „Einsatzbericht" abhaken bzw. wieder öffnen. Die Bedingung wird HIER
// geprüft, nicht nur im Formular: ein ausgegrauter Knopf ist keine Regel.
//
// Beide Aktionen kehren dorthin zurück, wo sie ausgelöst wurden — die
// Aufgabenliste und der Terminkalender teilen sie sich, und nach dem Abhaken
// will man dort weitermachen, wo man war.

const DEFAULT_BACK = "/admin/aufgaben";

/** Rücksprungziel aus dem Formular; alles Fremde landet auf der Aufgabenliste. */
function backTo(formData: FormData, params: string): string {
  const raw = String(formData.get("back") ?? "").trim();
  const safe = raw.startsWith("/admin/") && !raw.includes("//") ? raw : DEFAULT_BACK;
  return `${safe}${safe.includes("?") ? "&" : "?"}${params}`;
}

export async function completeMissionReport(formData: FormData): Promise<void> {
  await requireAdmin();
  const missionId = String(formData.get("missionId") ?? "").trim();
  if (!missionId) redirect(backTo(formData, "err=not-found"));

  const { complete } = await missionReportComplete(missionId);
  if (!complete) redirect(backTo(formData, "err=report-incomplete"));

  let failed = false;
  try {
    await db.missionReportTask.update({
      where: { missionId },
      data: { status: "DONE", doneAt: new Date() },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(backTo(formData, "err=failed"));
  redirect(backTo(formData, "ok=report-done"));
}

export async function reopenMissionReport(formData: FormData): Promise<void> {
  await requireAdmin();
  const missionId = String(formData.get("missionId") ?? "").trim();
  if (!missionId) redirect(backTo(formData, "err=not-found"));

  let failed = false;
  try {
    await db.missionReportTask.update({
      where: { missionId },
      data: { status: "OPEN", doneAt: null },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(backTo(formData, "err=failed"));
  redirect(backTo(formData, "ok=report-open"));
}
