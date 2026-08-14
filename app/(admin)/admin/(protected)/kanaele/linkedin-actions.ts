"use server";

import { requireAdmin, ForbiddenError } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { getSecret } from "@/lib/secrets";
import { getMemberUrn, postShare } from "@/lib/channels/linkedin";

// Direkte Veröffentlichung eines fertigen Beitragstexts auf LinkedIn (der andere
// Weg neben dem manuellen Teilen — die Redakteurin entscheidet pro Beitrag).
// Nutzt dieselbe LinkedIn-Verbindung wie die geplante Veröffentlichung. Fehler
// werden als Text zurückgegeben, damit das Teilen-Popup sie anzeigen kann.
export async function publishToLinkedIn(
  text: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return { ok: false, error: error instanceof ForbiddenError ? error.message : "Keine Berechtigung." };
  }
  const body = text.trim();
  if (!body) return { ok: false, error: "Kein Text zum Veröffentlichen." };

  try {
    const account = await db.channelAccount.findUnique({ where: { platform: "LINKEDIN" } });
    if (!account?.connected || !account.tokenRef) {
      return { ok: false, error: "LinkedIn ist nicht verbunden. Unter „Kanäle“ verbinden." };
    }
    if (account.expiresAt && account.expiresAt <= new Date()) {
      return { ok: false, error: "LinkedIn-Zugriff abgelaufen. Unter „Kanäle“ neu autorisieren." };
    }
    const token = await getSecret(account.tokenRef);
    if (!token) {
      return { ok: false, error: "Kein gültiges Zugriffstoken. Unter „Kanäle“ neu autorisieren." };
    }
    const author = await getMemberUrn(token);
    const url = await postShare(token, author, { text: body });
    return { ok: true, url };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Veröffentlichen fehlgeschlagen." };
  }
}
