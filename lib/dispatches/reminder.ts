// Erinnerung an das Veröffentlichungsdatum einer Depesche. Läuft im Job-Takt
// mit und schickt EINE Mail je Termin: „In drei Tagen geht das raus — Inhalte
// prüfen und den Status setzen." Wird das Datum verschoben, wird die Erinnerung
// zurückgesetzt und beim neuen Termin erneut fällig.
//
// Reine Logik ohne Datenbank und ohne Versand — damit die Frage „ist das jetzt
// fällig?" prüfbar bleibt. Die Einstellungen (Vorlauf, Empfänger) liegen
// zentral in lib/reminders/config.ts, weil sie sich Einsatzberichte und
// Depeschen teilen.

const DAY_MS = 86_400_000;

export interface ReminderCandidate {
  id: string;
  /** Titel der deutschen Fassung, für die Mail. */
  title: string;
  status: string;
  publishAt: Date | null;
  reminderSentAt: Date | null;
}

/**
 * Ist für diese Depesche jetzt eine Erinnerung fällig?
 *
 * Fällig ist sie, wenn ein Veröffentlichungsdatum gesetzt ist, es innerhalb der
 * Vorlaufzeit liegt (oder schon überschritten ist, ohne dass veröffentlicht
 * wurde), die Depesche noch nicht öffentlich ist und für diesen Termin noch
 * keine Erinnerung heraus ging.
 */
export function isReminderDue(
  entry: ReminderCandidate,
  leadDays: number,
  now: Date = new Date(),
): boolean {
  if (entry.status !== "DRAFT" && entry.status !== "SCHEDULED") return false;
  if (!entry.publishAt) return false;
  if (entry.reminderSentAt) return false;
  const threshold = now.getTime() + leadDays * DAY_MS;
  return entry.publishAt.getTime() <= threshold;
}

/** Alle fälligen Einträge, aufsteigend nach Termin (das Dringlichste zuerst). */
export function dueReminders(
  entries: ReminderCandidate[],
  leadDays: number,
  now: Date = new Date(),
): ReminderCandidate[] {
  return entries
    .filter((e) => isReminderDue(e, leadDays, now))
    .sort((a, b) => (a.publishAt?.getTime() ?? 0) - (b.publishAt?.getTime() ?? 0));
}

/** Ganze Tage bis zum Termin; negativ, wenn er bereits vorbei ist. */
export function daysUntil(publishAt: Date, now: Date = new Date()): number {
  return Math.round((publishAt.getTime() - now.getTime()) / DAY_MS);
}
