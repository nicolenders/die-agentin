import { db } from "@/lib/db";
import { dueReminders, type ReminderCandidate } from "@/lib/dispatches/reminder";
import { reminderBody, reminderSubject } from "@/lib/dispatches/reminder-mail";
import { dueReportReminders, type ReportReminderTask } from "@/lib/missions/report-reminder";
import { reportReminderBody, reportReminderSubject } from "@/lib/missions/report-reminder-mail";
import { sendMail } from "@/lib/mail/send";
import { getReminderSettings } from "@/lib/queries/settings";

// Erinnerungslauf: Welche Depeschen nähern sich ihrem Veröffentlichungsdatum,
// und welche Einsatzberichte fehlen? Läuft im selben Takt wie die geplante
// Veröffentlichung (alle fünf Minuten über /api/jobs/run).
//
// Je Anlass EINE Mail für alles Fällige, und je Eintrag eine Marke, damit
// derselbe Termin nicht zweimal erinnert wird.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export interface ReminderRunResult {
  /** IDs der Depeschen, für die erinnert wurde. */
  reminded: string[];
  /** IDs der Einsatz-Aufgaben, für die erinnert wurde. */
  remindedReports: string[];
  /** Gründe, wenn nichts verschickt wurde (abgeschaltet, kein Mailversand …). */
  skipped?: string;
}

/** Fehlgeschlagene Erinnerung protokollieren, statt sie still zu verlieren. */
async function noteFailure(action: string, entityId: string, error: string): Promise<void> {
  try {
    await db.auditLog.create({
      data: { actor: "scheduler", action, entity: "reminder", entityId, detail: error },
    });
  } catch {
    // Ohne Protokoll weiter — der nächste Lauf versucht es ohnehin erneut.
  }
}

export async function runDispatchReminders(now: Date = new Date()): Promise<ReminderRunResult> {
  const settings = await getReminderSettings();
  const skipped: string[] = [];
  if (!settings.email) {
    return { reminded: [], remindedReports: [], skipped: "Keine Empfängeradresse hinterlegt." };
  }

  // --- Depeschen ----------------------------------------------------------
  let reminded: string[] = [];
  if (!settings.dispatchEnabled) {
    skipped.push("Depeschen-Erinnerungen sind abgeschaltet.");
  } else {
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

    const due = dueReminders(candidates, settings.dispatchLeadDays, now);
    if (due.length > 0) {
      const result = await sendMail({
        to: settings.email,
        subject: reminderSubject(due),
        text: reminderBody({ entries: due, siteUrl: SITE, now }),
        date: now,
      });
      if (result.ok) {
        reminded = due.map((d) => d.id);
        await db.dispatch.updateMany({ where: { id: { in: reminded } }, data: { reminderSentAt: now } });
      } else {
        // Nicht markieren — beim nächsten Lauf wird es erneut versucht.
        await noteFailure("dispatch.reminder.failed", due[0]!.id, result.error ?? "Mailversand fehlgeschlagen.");
        skipped.push(result.error ?? "Mailversand fehlgeschlagen.");
      }
    }
  }

  // --- Einsatzberichte ----------------------------------------------------
  let remindedReports: string[] = [];
  if (!settings.missionEnabled) {
    skipped.push("Einsatzbericht-Erinnerungen sind abgeschaltet.");
  } else {
    const rows = await db.missionReportTask.findMany({
      where: { status: "OPEN" },
      select: {
        id: true,
        missionId: true,
        dueOn: true,
        status: true,
        reminderBeforeSentAt: true,
        reminderAfterSentAt: true,
        mission: { select: { eventName: true } },
      },
    });
    const tasks: ReportReminderTask[] = rows.map((r) => ({
      id: r.id,
      missionId: r.missionId,
      eventName: r.mission.eventName,
      dueOn: r.dueOn,
      status: r.status,
      reminderBeforeSentAt: r.reminderBeforeSentAt,
      reminderAfterSentAt: r.reminderAfterSentAt,
    }));

    const due = dueReportReminders(
      tasks,
      { beforeDays: settings.missionBeforeDays, afterDays: settings.missionAfterDays },
      now,
    );
    if (due.length > 0) {
      const result = await sendMail({
        to: settings.email,
        subject: reportReminderSubject(due),
        text: reportReminderBody({ entries: due, siteUrl: SITE, now }),
        date: now,
      });
      if (result.ok) {
        remindedReports = due.map((d) => d.task.id);
        const beforeIds = due.filter((d) => d.kind === "before").map((d) => d.task.id);
        const afterIds = due.filter((d) => d.kind === "after").map((d) => d.task.id);
        if (beforeIds.length > 0) {
          await db.missionReportTask.updateMany({
            where: { id: { in: beforeIds } },
            data: { reminderBeforeSentAt: now },
          });
        }
        if (afterIds.length > 0) {
          await db.missionReportTask.updateMany({
            where: { id: { in: afterIds } },
            data: { reminderAfterSentAt: now },
          });
        }
      } else {
        await noteFailure("mission.reminder.failed", due[0]!.task.id, result.error ?? "Mailversand fehlgeschlagen.");
        skipped.push(result.error ?? "Mailversand fehlgeschlagen.");
      }
    }
  }

  if (reminded.length > 0 || remindedReports.length > 0) {
    try {
      await db.auditLog.create({
        data: {
          actor: "scheduler",
          action: "reminder.sent",
          entity: "reminder",
          entityId: reminded[0] ?? remindedReports[0] ?? "-",
          detail: `${reminded.length} Depeschen, ${remindedReports.length} Einsatzberichte an ${settings.email}`,
        },
      });
    } catch {
      // Protokoll ist Beiwerk.
    }
  }

  return {
    reminded,
    remindedReports,
    ...(skipped.length > 0 ? { skipped: skipped.join(" ") } : {}),
  };
}
