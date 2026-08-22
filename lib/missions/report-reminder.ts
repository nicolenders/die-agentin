// Erinnerungen an den Einsatzbericht: einmal VOR dem Einsatz („denk an Fotos
// und Notizen"), einmal DANACH („der Bericht fehlt noch"). Beide Abstände sind
// in den Einstellungen gepflegt.
//
// Reine Auswahl ohne Datenbank und ohne Versand — die Frage „ist das jetzt
// fällig?" bleibt so prüfbar.

export type ReportReminderKind = "before" | "after";

export interface ReportReminderTask {
  id: string;
  missionId: string;
  eventName: string;
  /** Der Einsatztag. */
  dueOn: Date;
  status: string; // OPEN | DONE
  reminderBeforeSentAt: Date | null;
  reminderAfterSentAt: Date | null;
}

export interface ReportReminderWindow {
  beforeDays: number;
  afterDays: number;
}

export interface DueReportReminder {
  kind: ReportReminderKind;
  task: ReportReminderTask;
  /** Ganze Tage bis zum Einsatz; negativ, wenn er vorbei ist. */
  days: number;
}

const DAY_MS = 86_400_000;

/** Tagesgenau rechnen: Uhrzeiten sind hier bedeutungslos. */
function startOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Ganze Tage vom heutigen Tag bis zum Einsatztag. Negativ = liegt zurück. */
export function daysUntilDue(dueOn: Date, now: Date): number {
  return Math.round((startOfDay(dueOn) - startOfDay(now)) / DAY_MS);
}

/**
 * Die Erinnerung VOR dem Einsatz: fällig, sobald der Einsatz näher als die
 * eingestellte Vorlaufzeit ist — aber nur, solange er noch bevorsteht. Ein
 * nachgetragener Einsatz aus dem letzten Jahr bekommt keine „in drei Tagen".
 */
export function isBeforeDue(task: ReportReminderTask, beforeDays: number, now: Date): boolean {
  if (task.status === "DONE") return false;
  if (task.reminderBeforeSentAt) return false;
  const days = daysUntilDue(task.dueOn, now);
  return days >= 0 && days <= beforeDays;
}

/**
 * Die Erinnerung NACH dem Einsatz: fällig, sobald der eingestellte Abstand
 * verstrichen ist und der Bericht immer noch offen ist.
 */
export function isAfterDue(task: ReportReminderTask, afterDays: number, now: Date): boolean {
  if (task.status === "DONE") return false;
  if (task.reminderAfterSentAt) return false;
  return daysUntilDue(task.dueOn, now) <= -afterDays;
}

/**
 * Alle fälligen Erinnerungen, das Dringlichste zuerst: erst die überfälligen
 * Berichte (am längsten offen zuerst), dann die anstehenden Einsätze.
 */
export function dueReportReminders(
  tasks: ReportReminderTask[],
  window: ReportReminderWindow,
  now: Date = new Date(),
): DueReportReminder[] {
  const due: DueReportReminder[] = [];
  for (const task of tasks) {
    const days = daysUntilDue(task.dueOn, now);
    // „Nach" hat Vorrang: Ist ein Einsatz vorbei, ist die Vorher-Erinnerung
    // gegenstandslos — sonst käme beides für denselben Einsatz.
    if (isAfterDue(task, window.afterDays, now)) due.push({ kind: "after", task, days });
    else if (isBeforeDue(task, window.beforeDays, now)) due.push({ kind: "before", task, days });
  }
  return due.sort((a, b) => a.days - b.days);
}
