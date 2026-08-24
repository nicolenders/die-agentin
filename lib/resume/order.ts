import { parsePeriod, type YearMonth } from "@/lib/resume/skills";

// Reihenfolge im Lebenslauf.
//
// Werdegang und Projektreferenzen sortieren sich selbst: neueste Station
// zuerst, abgeleitet aus „von“/„bis“. Das ist die Reihenfolge, die jede
// Personalabteilung erwartet, und sie bleibt richtig, ohne dass jemand nach
// jedem neuen Eintrag Pfeile drückt.
//
// Einträge ohne lesbares Datum — etwa die Altprojekte, die in den Quellen nur
// eine Dauer haben („6 Monate“) — stehen dahinter und behalten die
// Reihenfolge, die im Adminbereich eingestellt ist.
//
// Ausbildung und Fähigkeiten bleiben bewusst von Hand sortiert: Dort steht
// selten ein Datum, und die Reihenfolge ist eine Aussage über Gewichtung.

export interface ResumePeriodLike {
  periodFrom: string | null;
  periodTo: string | null;
}

/** Monate seit dem Jahr 0 — ein vergleichbarer Zahlenwert für einen Zeitpunkt. */
function toMonths(value: YearMonth): number {
  return value.year * 12 + value.month;
}

function nowMonths(now: Date): number {
  return now.getUTCFullYear() * 12 + now.getUTCMonth();
}

/**
 * Der Beginn eines Eintrags als Zahl. `null` heißt: nicht lesbar — der Eintrag
 * lässt sich nicht einsortieren und wandert ans Ende.
 */
export function startOf(entry: ResumePeriodLike, now: Date = new Date()): number | null {
  const parsed = parsePeriod(entry.periodFrom);
  if (parsed === null) return null;
  return parsed === "open" ? nowMonths(now) : toMonths(parsed);
}

/** Das Ende eines Eintrags. Ein laufender Einsatz („heute“) gilt als am neuesten. */
function endOf(entry: ResumePeriodLike, fallback: number): number {
  const parsed = parsePeriod(entry.periodTo);
  if (parsed === "open") return Number.MAX_SAFE_INTEGER;
  if (parsed === null) return fallback;
  const months = toMonths(parsed);
  // Ein Ende vor dem Beginn ist ein Tippfehler; dann zählt der Beginn.
  return months < fallback ? fallback : months;
}

/** Hat der Eintrag ein Datum, aus dem sich seine Position ergibt? */
export function hasReadablePeriod(entry: ResumePeriodLike, now: Date = new Date()): boolean {
  return startOf(entry, now) !== null;
}

/**
 * Neueste zuerst. Gleiche Startmonate entscheidet das spätere Ende; ist auch
 * das gleich, bleibt die übergebene Reihenfolge erhalten (die Liste kommt nach
 * `sortOrder` sortiert an). Einträge ohne lesbares Datum stehen am Ende.
 */
export function sortByPeriodDesc<T extends ResumePeriodLike>(
  items: readonly T[],
  now: Date = new Date(),
): T[] {
  return [...items].sort((a, b) => {
    const startA = startOf(a, now);
    const startB = startOf(b, now);
    if (startA === null && startB === null) return 0;
    if (startA === null) return 1;
    if (startB === null) return -1;
    if (startA !== startB) return startB - startA;
    const endA = endOf(a, startA);
    const endB = endOf(b, startB);
    return endB - endA;
  });
}

/**
 * Projekte zerfallen in zwei Listen, und zwar an den Daten selbst, nicht an
 * einem zusätzlichen Feld: Wer einen Zeitraum hat, steht unter
 * „Projektreferenzen“; wer nur eine Dauer kennt („6 Monate“, aus den alten
 * Profil-Dokumenten), steht unter „Ältere Projekte“.
 *
 * Abgeleitet statt gespeichert, weil es sich damit von selbst korrigiert:
 * Trägt Nicole später einen Zeitraum nach, rückt der Eintrag ohne weiteres
 * Zutun nach oben zu den datierten Projekten.
 */
export function splitProjects<T extends ResumePeriodLike>(
  items: readonly T[],
  now: Date = new Date(),
): { dated: T[]; undated: T[] } {
  const dated: T[] = [];
  const undated: T[] = [];
  for (const item of items) {
    (hasReadablePeriod(item, now) ? dated : undated).push(item);
  }
  return { dated: sortByPeriodDesc(dated, now), undated };
}

/** Rubriken, die sich selbst nach Zeitraum sortieren. */
const AUTO_SORTED = new Set(["CAREER", "PROJECT"]);

export function isAutoSorted(section: string): boolean {
  return AUTO_SORTED.has(section);
}

/**
 * Die Liste einer Rubrik in Anzeigereihenfolge. Eine Stelle für alle: die
 * öffentliche Seite, die Tabelle im Adminbereich, der Auswahldialog und die
 * Pfeile zum Umsortieren müssen dieselbe Reihenfolge sehen — sonst verschiebt
 * ein Pfeil etwas anderes, als er anzeigt.
 */
export function inDisplayOrder<T extends ResumePeriodLike>(
  section: string,
  items: readonly T[],
  now: Date = new Date(),
): T[] {
  return isAutoSorted(section) ? sortByPeriodDesc(items, now) : [...items];
}
