import type { DueReportReminder } from "./report-reminder";

// Text der Erinnerung an offene Einsatzberichte. Getrennt von Auswahl und
// Versand, damit sich der Wortlaut prüfen lässt — er ist das Einzige, was von
// dieser Funktion je jemand zu sehen bekommt.

export interface ReportReminderMailInput {
  entries: DueReportReminder[];
  /** Basisadresse der Website, für die Links in die Redaktion. */
  siteUrl: string;
  now?: Date;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(value);
}

/** Wie der Termin in der Mail steht — aus Sicht des Einsatztages. */
export function describeDue(days: number): string {
  if (days > 1) return `in ${days} Tagen`;
  if (days === 1) return "morgen";
  if (days === 0) return "heute";
  if (days === -1) return "seit gestern offen";
  return `seit ${Math.abs(days)} Tagen offen`;
}

export function reportReminderSubject(entries: DueReportReminder[]): string {
  if (entries.length === 1) {
    const { kind, task } = entries[0]!;
    return kind === "before"
      ? `Einsatz steht an: ${task.eventName}`
      : `Einsatzbericht fehlt: ${task.eventName}`;
  }
  const open = entries.filter((e) => e.kind === "after").length;
  if (open === entries.length) return `${entries.length} Einsatzberichte stehen aus`;
  return `${entries.length} Einsätze brauchen deine Aufmerksamkeit`;
}

export function reportReminderBody(input: ReportReminderMailInput): string {
  const base = input.siteUrl.replace(/\/+$/, "");
  const before = input.entries.filter((e) => e.kind === "before");
  const after = input.entries.filter((e) => e.kind === "after");
  const lines: string[] = ["Hallo Nicole,", ""];

  if (before.length > 0) {
    lines.push(
      before.length === 1 ? "ein Einsatz steht an:" : "diese Einsätze stehen an:",
      "",
    );
    for (const { task, days } of before) {
      lines.push(`• ${task.eventName} — ${formatDate(task.dueOn)} (${describeDue(days)})`);
      lines.push(`  ${base}/admin/einsaetze/bearbeiten?mission=${task.missionId}`);
    }
    lines.push("", "Denk an Fotos und Notizen — daraus wird nachher der Bericht.", "");
  }

  if (after.length > 0) {
    lines.push(
      after.length === 1 ? "dieser Einsatzbericht fehlt noch:" : "diese Einsatzberichte fehlen noch:",
      "",
    );
    for (const { task, days } of after) {
      lines.push(`• ${task.eventName} — ${formatDate(task.dueOn)} (${describeDue(days)})`);
      lines.push(`  ${base}/admin/einsaetze/bearbeiten?mission=${task.missionId}`);
    }
    lines.push(
      "",
      "Texte zur Veranstaltung und zum Vortrag ergänzen, dann lässt sich die Aufgabe",
      "abhaken:",
      `${base}/admin/aufgaben`,
      "",
    );
  }

  lines.push("— Die Zentrale");
  return lines.join("\n");
}
