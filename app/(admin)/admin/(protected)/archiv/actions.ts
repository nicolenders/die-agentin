"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags, tags } from "@/lib/cache";

const LIST = "/admin/archiv";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function invalidate(): void {
  invalidateTags([
    tags.dispatchList("de"), tags.dispatchList("en"),
    tags.missionList("de"), tags.missionList("en"),
  ]);
}

/** Zurück nach DRAFT (Wiederherstellen aus dem Archiv). */
export async function restoreEntry(formData: FormData): Promise<void> {
  await requireAdmin();
  const kind = str(formData, "kind");
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  let failed = false;
  try {
    if (kind === "dispatch") await db.dispatch.update({ where: { id }, data: { status: "DRAFT" } });
    else if (kind === "mission") await db.mission.update({ where: { id }, data: { contentStatus: "DRAFT" } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidate();
  redirect(`${LIST}?tab=${kind}&ok=restored`);
}

/** Endgültig löschen (mit Bestätigung im UI). */
export async function purgeEntry(formData: FormData): Promise<void> {
  await requireAdmin();
  const kind = str(formData, "kind");
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  let failed = false;
  try {
    if (kind === "dispatch") await db.dispatch.delete({ where: { id } });
    else if (kind === "mission") await db.mission.delete({ where: { id } });
  } catch {
    // Mission mit verknüpften TalkDeliveries (NoAction) lässt sich nicht direkt löschen.
    failed = true;
  }
  if (failed) redirect(`${LIST}?tab=${kind}&err=failed`);
  invalidate();
  redirect(`${LIST}?tab=${kind}&ok=deleted`);
}
