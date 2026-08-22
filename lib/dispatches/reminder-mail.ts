import { daysUntil, type ReminderCandidate } from "./reminder";

// Text der Erinnerungsmail. Getrennt von Versand und Auswahl, damit sich der
// Wortlaut prüfen lässt — und weil er das Einzige ist, was Nicole davon sieht.

export interface ReminderMailInput {
  entries: ReminderCandidate[];
  /** Basisadresse der Website, für die Links in die Redaktion. */
  siteUrl: string;
  now?: Date;
}

/** Wie ein Termin in der Mail steht: „in 3 Tagen", „morgen", „seit 2 Tagen überfällig". */
export function describeDue(publishAt: Date, now: Date): string {
  const days = daysUntil(publishAt, now);
  if (days < 0) return `seit ${Math.abs(days)} ${Math.abs(days) === 1 ? "Tag" : "Tagen"} überfällig`;
  if (days === 0) return "heute";
  if (days === 1) return "morgen";
  return `in ${days} Tagen`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(value);
}

export function reminderSubject(entries: ReminderCandidate[]): string {
  if (entries.length === 1) return `Depesche prüfen: ${entries[0]!.title}`;
  return `${entries.length} Depeschen stehen zur Veröffentlichung an`;
}

export function reminderBody(input: ReminderMailInput): string {
  const now = input.now ?? new Date();
  const base = input.siteUrl.replace(/\/+$/, "");
  const lines: string[] = [
    "Hallo Nicole,",
    "",
    input.entries.length === 1
      ? "eine Depesche nähert sich ihrem Veröffentlichungsdatum:"
      : "diese Depeschen nähern sich ihrem Veröffentlichungsdatum:",
    "",
  ];
  for (const entry of input.entries) {
    const when = entry.publishAt ? `${formatDate(entry.publishAt)} (${describeDue(entry.publishAt, now)})` : "ohne Termin";
    lines.push(`• ${entry.title} — ${when}`);
    lines.push(`  ${base}/admin/depeschen/bearbeiten?id=${entry.id}`);
  }
  lines.push(
    "",
    "Bitte die Inhalte prüfen und den Status setzen: „Terminiert“ veröffentlicht",
    "automatisch zum Termin, „Entwurf“ bleibt liegen.",
    "",
    "— Die Zentrale",
  );
  return lines.join("\n");
}
