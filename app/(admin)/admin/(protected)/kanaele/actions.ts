"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { PLATFORMS, isOneOf } from "@/lib/domain";

// Kanal-Aktionen (SPEC §7). „Verbunden" heißt für alle Kanäle schlicht
// aktiviert — geteilt wird überall gleich: Text kopieren, Profil öffnen.

export async function setChannelConnected(formData: FormData): Promise<void> {
  await requireAdmin();
  const platformRaw = String(formData.get("platform") ?? "");
  const connected = String(formData.get("connected") ?? "") === "true";
  if (!isOneOf(PLATFORMS, platformRaw)) return;

  await db.channelAccount.upsert({
    where: { platform: platformRaw },
    create: { platform: platformRaw, displayName: platformRaw, connected },
    update: { connected },
  });
  revalidatePath("/admin/kanaele");
}

export async function retryTask(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Fehlgeschlagene Aufgabe erneut einreihen (SPEC §7: Wiederholung).
  await db.channelTask.update({
    where: { id },
    data: { state: "PENDING", attempts: 0, lastError: null, scheduledAt: new Date() },
  });
  revalidatePath("/admin/kanaele");
}

export async function markManualDone(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!id) return { ok: false };
  await db.channelTask.update({ where: { id }, data: { state: "MANUAL_DONE" } });
  revalidatePath("/admin/kanaele");
  return { ok: true };
}
