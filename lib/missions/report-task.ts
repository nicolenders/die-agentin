import { isRichEmpty } from "@/lib/content/rich";

// Aufgabe „Einsatzbericht schreiben". Zu jedem Einsatz gehört genau eine; sie
// steht im Terminkalender neben dem Einsatz und lässt sich erst abhaken, wenn
// der Bericht wirklich existiert. Die Regel steht hier — nicht in der Maske —,
// damit sie beim Speichern serverseitig gilt und nicht nur ein ausgegrauter
// Knopf ist.

export interface MissionReportSource {
  /** Deutsche Fassung: Text über die Veranstaltung. */
  eventText: string | null | undefined;
  /** Deutsche Fassung: Text über den eigenen Einsatz/Vortrag. */
  talkText: string | null | undefined;
  /** Anzahl hinterlegter Fotos. Optional — Bilder sind eine Kür, keine Pflicht. */
  photoCount: number;
}

export interface ReportReadiness {
  /** Ob die Aufgabe abgehakt werden darf. */
  complete: boolean;
  /** Was noch fehlt, in Nicoles Sprache — für die Meldung in der Oberfläche. */
  missing: string[];
  /** Bilder fehlen: kein Hinderungsgrund, aber ein Hinweis. */
  photosMissing: boolean;
}

/**
 * Prüft, ob der Einsatzbericht vollständig genug ist, um die Aufgabe zu
 * schließen: beide Textbereiche der deutschen Fassung müssen sichtbaren Text
 * haben. Bilder werden gemeldet, blockieren aber nicht — nicht jeder Einsatz
 * bringt Fotos mit.
 */
export function reportReadiness(source: MissionReportSource): ReportReadiness {
  const missing: string[] = [];
  if (isRichEmpty(source.eventText)) missing.push("Text zur Veranstaltung");
  if (isRichEmpty(source.talkText)) missing.push("Text zum Vortrag");
  return {
    complete: missing.length === 0,
    missing,
    photosMissing: source.photoCount === 0,
  };
}

/** Stichtag der Aufgabe: Ende des Einsatzes, ersatzweise sein Beginn. */
export function reportDueDate(startDate: Date, endDate: Date | null | undefined): Date {
  return endDate ?? startDate;
}

/**
 * Ist die Aufgabe überfällig? Offen und der Einsatz liegt hinter uns — vorher
 * gibt es schlicht nichts zu berichten.
 */
export function isReportOverdue(
  status: string,
  dueOn: Date,
  now: Date = new Date(),
): boolean {
  return status !== "DONE" && dueOn.getTime() < now.getTime();
}
