import { db } from "@/lib/db";
import { getReminderSettings } from "@/lib/queries/settings";
import {
  earliest,
  dispatchReminderMoment,
  reportReminderMoment,
} from "@/lib/jobs/next-due";

// Rechnet aus, wann der Job das nächste Mal gebraucht wird. Läuft am Ende eines
// vollständigen Laufs — also genau dann, wenn die Datenbank ohnehin wach ist.
// Das Ergebnis landet als Terminnotiz außerhalb der Datenbank
// (lib/jobs/schedule-hint.ts); die Ticks dazwischen kommen ohne sie aus.

export async function computeNextDue(now: Date = new Date()): Promise<Date | null> {
  const moments: (Date | null)[] = [];

  // Terminierte Beiträge und Depeschen: der früheste offene Termin.
  const nextPost = await db.post.findFirst({
    where: { status: "SCHEDULED", publishAt: { not: null } },
    orderBy: { publishAt: "asc" },
    select: { publishAt: true },
  });
  moments.push(nextPost?.publishAt ?? null);

  const nextDispatch = await db.dispatch.findFirst({
    where: { status: "SCHEDULED", publishAt: { not: null } },
    orderBy: { publishAt: "asc" },
    select: { publishAt: true },
  });
  moments.push(nextDispatch?.publishAt ?? null);

  // Erinnerungen nur, wenn überhaupt verschickt wird — ohne Empfänger gibt es
  // nichts zu tun und damit keinen Grund, die Datenbank dafür zu wecken.
  const settings = await getReminderSettings();
  if (settings.email) {
    if (settings.dispatchEnabled) {
      const rows = await db.dispatch.findMany({
        where: {
          status: { in: ["DRAFT", "SCHEDULED"] },
          publishAt: { not: null },
          reminderSentAt: null,
        },
        select: { status: true, publishAt: true, reminderSentAt: true },
      });
      moments.push(
        earliest(rows.map((r) => dispatchReminderMoment(r, settings.dispatchLeadDays))),
      );
    }

    if (settings.missionEnabled) {
      const tasks = await db.missionReportTask.findMany({
        where: { status: "OPEN" },
        select: {
          status: true,
          dueOn: true,
          reminderBeforeSentAt: true,
          reminderAfterSentAt: true,
        },
      });
      moments.push(
        earliest(
          tasks.map((t) =>
            reportReminderMoment(
              t,
              { beforeDays: settings.missionBeforeDays, afterDays: settings.missionAfterDays },
              now,
            ),
          ),
        ),
      );
    }
  }

  return earliest(moments);
}
