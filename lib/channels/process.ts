import { db } from "@/lib/db";
import { getSecret } from "@/lib/secrets";
import { getMemberUrn, postShare } from "./linkedin";

// Verarbeitung der Kanal-Aufgaben (SPEC §7). LinkedIn wird automatisch
// versendet: drei Versuche mit exponentiellem Backoff, danach FAILED mit
// sichtbarer Meldung. Ohne gültige Verbindung fällt der Task auf MANUAL_OPEN
// zurück, statt zu scheitern (SPEC §7.1).

const MAX_ATTEMPTS = 3;

export interface ProcessResult {
  sent: string[];
  failed: string[];
  manual: string[];
}

export async function processChannelTasks(now: Date = new Date()): Promise<ProcessResult> {
  const result: ProcessResult = { sent: [], failed: [], manual: [] };

  const account = await db.channelAccount.findUnique({ where: { platform: "LINKEDIN" } });
  const tasks = await db.channelTask.findMany({
    where: { platform: "LINKEDIN", state: "PENDING", scheduledAt: { lte: now } },
  });

  const connectionUsable =
    account?.connected &&
    account.tokenRef &&
    (!account.expiresAt || account.expiresAt > now);

  for (const task of tasks) {
    if (!connectionUsable || !account?.tokenRef) {
      await db.channelTask.update({
        where: { id: task.id },
        data: { state: "MANUAL_OPEN", lastError: "LinkedIn-Verbindung fehlt oder ist abgelaufen." },
      });
      result.manual.push(task.id);
      continue;
    }

    try {
      const token = await getSecret(account.tokenRef);
      if (!token) throw new Error("Kein Zugriffstoken hinterlegt.");
      const payload = JSON.parse(task.payload) as { text: string; url?: string };
      const author = await getMemberUrn(token);
      const remoteUrl = await postShare(token, author, { text: payload.text, url: payload.url });
      await db.channelTask.update({
        where: { id: task.id },
        data: { state: "SENT", sentAt: now, remoteUrl, attempts: task.attempts + 1, lastError: null },
      });
      result.sent.push(task.id);
    } catch (error) {
      const attempts = task.attempts + 1;
      const message = error instanceof Error ? error.message : "Unbekannter Fehler.";
      if (attempts >= MAX_ATTEMPTS) {
        await db.channelTask.update({
          where: { id: task.id },
          data: { state: "FAILED", attempts, lastError: message },
        });
        result.failed.push(task.id);
      } else {
        // Exponentieller Backoff: nächster Versuch später einplanen.
        const delayMin = Math.pow(2, attempts);
        await db.channelTask.update({
          where: { id: task.id },
          data: {
            attempts,
            lastError: message,
            scheduledAt: new Date(now.getTime() + delayMin * 60 * 1000),
          },
        });
      }
    }
  }

  return result;
}
