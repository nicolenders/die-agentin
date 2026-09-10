// Wann muss der Job das nächste Mal wirklich in die Datenbank schauen?
//
// Hintergrund (docs/decisions/0032-kosten-der-laufzeit.md): Die Azure-SQL-
// Datenbank ist serverlos und pausiert bei Ruhe. Jede Berührung weckt sie und
// hält sie für die Dauer des Auto-Pause-Delays wach — bezahlt wird die
// Online-Zeit, nicht die Abfrage. Ein Tick, der „nur mal nachsieht, ob etwas
// fällig ist", kostet damit genauso viel wie eine echte Veröffentlichung.
//
// Deshalb rechnet der Lauf am Ende aus, wann er das nächste Mal gebraucht wird,
// und legt das Ergebnis außerhalb der Datenbank ab (lib/jobs/schedule-hint.ts).
// Bis dahin läuft der Tick, ohne die Datenbank anzufassen.
//
// Hier steht die reine Rechnung dazu — ohne Datenbank, damit sie prüfbar ist.

const DAY_MS = 86_400_000;

/** Tagesbeginn in UTC, als Zeitstempel. Erinnerungen rechnen tagesgenau. */
function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Der früheste der übergebenen Zeitpunkte; `null`, wenn keiner gesetzt ist. */
export function earliest(moments: readonly (Date | null | undefined)[]): Date | null {
  let best: Date | null = null;
  for (const moment of moments) {
    if (!moment) continue;
    if (!best || moment.getTime() < best.getTime()) best = moment;
  }
  return best;
}

export interface ScheduledEntry {
  status: string;
  publishAt: Date | null;
}

/**
 * Wann wird ein terminierter Beitrag veröffentlicht? Nur `SCHEDULED` zählt —
 * alles andere holt der Job nicht ab (siehe `runScheduledPublish`).
 */
export function publishMoment(entry: ScheduledEntry): Date | null {
  if (entry.status !== "SCHEDULED") return null;
  return entry.publishAt;
}

export interface ReminderEntry {
  status: string;
  publishAt: Date | null;
  reminderSentAt: Date | null;
}

/**
 * Wann wird die Erinnerung an eine Depesche fällig? Spiegelt `isReminderDue`
 * (lib/dispatches/reminder.ts): Vorlaufzeit vor dem Termin, einmal je Termin,
 * nur solange die Depesche nicht veröffentlicht ist.
 */
export function dispatchReminderMoment(entry: ReminderEntry, leadDays: number): Date | null {
  if (entry.status !== "DRAFT" && entry.status !== "SCHEDULED") return null;
  if (!entry.publishAt || entry.reminderSentAt) return null;
  return new Date(entry.publishAt.getTime() - leadDays * DAY_MS);
}

export interface ReportEntry {
  status: string;
  dueOn: Date;
  reminderBeforeSentAt: Date | null;
  reminderAfterSentAt: Date | null;
}

/**
 * Wann wird eine Erinnerung an einen Einsatzbericht fällig? Spiegelt
 * `isBeforeDue`/`isAfterDue` (lib/missions/report-reminder.ts).
 *
 * Wichtig ist der Fall, der nie wieder fällig wird: Ist der Einsatztag vorbei,
 * ist die Vorher-Erinnerung gegenstandslos. Gäbe man ihren Zeitpunkt trotzdem
 * zurück, stünde er für immer in der Vergangenheit — der Job hielte die
 * Datenbank dauerhaft wach für etwas, das er nie erledigen kann.
 */
export function reportReminderMoment(
  task: ReportEntry,
  window: { beforeDays: number; afterDays: number },
  now: Date,
): Date | null {
  if (task.status !== "OPEN") return null;
  const day = startOfUtcDay(task.dueOn);
  const today = startOfUtcDay(now);

  const before =
    task.reminderBeforeSentAt || day < today
      ? null
      : new Date(day - window.beforeDays * DAY_MS);
  const after = task.reminderAfterSentAt
    ? null
    : new Date(day + window.afterDays * DAY_MS);

  return earliest([before, after]);
}
