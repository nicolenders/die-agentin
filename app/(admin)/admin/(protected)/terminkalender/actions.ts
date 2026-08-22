"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { missionReportComplete } from "@/lib/queries/planning";

// Aufgabe „Einsatzbericht" abhaken bzw. wieder öffnen. Die Bedingung wird HIER
// geprüft, nicht nur im Formular: ein ausgegrauter Knopf ist keine Regel.

const PAGE = "/admin/terminkalender";

/** Nimmt die Filter der Liste mit zurück, damit die Ansicht erhalten bleibt. */
function back(formData: FormData, params: string): string {
  const query = String(formData.get("query") ?? "").replace(/^\?/, "");
  return `${PAGE}?${[query, params].filter(Boolean).join("&")}`;
}

export async function completeMissionReport(formData: FormData): Promise<void> {
  await requireAdmin();
  const missionId = String(formData.get("missionId") ?? "").trim();
  if (!missionId) redirect(back(formData, "err=not-found"));

  const { complete } = await missionReportComplete(missionId);
  if (!complete) redirect(back(formData, "err=report-incomplete"));

  let failed = false;
  try {
    await db.missionReportTask.update({
      where: { missionId },
      data: { status: "DONE", doneAt: new Date() },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(back(formData, "err=failed"));
  redirect(back(formData, "ok=report-done"));
}

export async function reopenMissionReport(formData: FormData): Promise<void> {
  await requireAdmin();
  const missionId = String(formData.get("missionId") ?? "").trim();
  if (!missionId) redirect(back(formData, "err=not-found"));

  let failed = false;
  try {
    await db.missionReportTask.update({
      where: { missionId },
      data: { status: "OPEN", doneAt: null },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(back(formData, "err=failed"));
  redirect(back(formData, "ok=report-open"));
}
