"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { deleteSecret } from "@/lib/secrets";
import { PLATFORMS, isOneOf } from "@/lib/domain";

// Kanal-Aktionen (SPEC §7). Für die Ein-Klick-Kanäle (X, Instagram, Facebook)
// bedeutet „verbunden" schlicht aktiviert; LinkedIn läuft über OAuth.

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

export async function disconnectLinkedIn(): Promise<void> {
  await requireAdmin();
  const account = await db.channelAccount.findUnique({ where: { platform: "LINKEDIN" } });
  if (account?.tokenRef) await deleteSecret(account.tokenRef);
  await db.channelAccount.update({
    where: { platform: "LINKEDIN" },
    data: { connected: false, tokenRef: null, expiresAt: null },
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
