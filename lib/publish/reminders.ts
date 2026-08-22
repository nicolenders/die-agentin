import { db } from "@/lib/db";
import { dueReminders, type ReminderCandidate } from "@/lib/dispatches/reminder";
import { reminderBody, reminderSubject } from "@/lib/dispatches/reminder-mail";
import { sendMail } from "@/lib/mail/send";
import { getReminderSettings } from "@/lib/queries/settings";

// Erinnerungslauf: Welche Depeschen nähern sich ihrem Veröffentlichungsdatum?
// Läuft im selben Takt wie die geplante Veröffentlichung (alle fünf Minuten
// über /api/jobs/run). Verschickt EINE Mail für alle fälligen Einträge und
// merkt sich das an jedem Eintrag, damit derselbe Termin nicht zweimal erinnert.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export interface ReminderRunResult {
  /** IDs der Depeschen, für die erinnert wurde. */
  reminded: string[];
  /** Grund, wenn nichts verschickt wurde (abgeschaltet, kein Mailversand …). */
  skipped?: string;
}

export async function runDispatchReminders(now: Date = new Date()): Promise<ReminderRunResult> {
  const settings = await getReminderSettings();
  if (!settings.enabled) return { reminded: [], skipped: "Erinnerungen sind abgeschaltet." };
  if (!settings.email) return { reminded: [], skipped: "Keine Empfängeradresse hinterlegt." };

  const rows = await db.dispatch.findMany({
    where: { status: { in: ["DRAFT", "SCHEDULED"] }, publishAt: { not: null } },
    select: {
      id: true,
      status: true,
      publishAt: true,
      reminderSentAt: true,
      translations: { where: { locale: "de" }, select: { title: true } },
    },
  });

  const candidates: ReminderCandidate[] = rows.map((r) => ({
    id: r.id,
    title: r.translations[0]?.title?.trim() || "(ohne Titel)",
    status: r.status,
    publishAt: r.publishAt,
    reminderSentAt: r.reminderSentAt,
  }));

  const due = dueReminders(candidates, settings.leadDays, now);
  if (due.length === 0) return { reminded: [] };

  const result = await sendMail({
    to: settings.email,
    subject: reminderSubject(due),
    text: reminderBody({ entries: due, siteUrl: SITE, now }),
    date: now,
  });

  if (!result.ok) {
    // Nicht als „erinnert" markieren — beim nächsten Lauf wird es erneut versucht.
    await db.auditLog.create({
      data: {
        actor: "scheduler",
        action: "dispatch.reminder.failed",
        entity: "dispatch",
        entityId: due[0]!.id,
        detail: result.error ?? "Mailversand fehlgeschlagen.",
      },
    });
    return { reminded: [], skipped: result.error };
  }

  const ids = due.map((d) => d.id);
  await db.dispatch.updateMany({ where: { id: { in: ids } }, data: { reminderSentAt: now } });
  await db.auditLog.create({
    data: {
      actor: "scheduler",
      action: "dispatch.reminder",
      entity: "dispatch",
      entityId: ids[0]!,
      detail: `${ids.length} erinnert an ${settings.email}`,
    },
  });
  return { reminded: ids };
}
