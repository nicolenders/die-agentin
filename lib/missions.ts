// Jahresfilter für die Einsätze-Ansicht (Phase 8.4). Server-seitig angewandt;
// die Auswahl steht in der URL. Standard: aktuelles Jahr plus alle zukünftig
// geplanten. Reine, testbare Logik.

export type YearSelection = "alle" | "aktuell" | number;

/** Alle Jahre mit Einsätzen, absteigend. */
export function availableMissionYears(years: number[]): number[] {
  return [...new Set(years)].sort((a, b) => b - a);
}

/** Parst den URL-Parameter `jahr` zu einer Auswahl. Leer/ungültig → „aktuell". */
export function parseYearSelection(raw: string | undefined | null): YearSelection {
  if (raw === "alle") return "alle";
  if (raw === "aktuell" || !raw) return "aktuell";
  const n = Number(raw);
  return Number.isInteger(n) && n > 1900 && n < 3000 ? n : "aktuell";
}

/**
 * Steht ein Einsatz noch an? Verglichen wird der Kalendertag, nicht der
 * Zeitpunkt: Was heute stattfindet, ist noch nicht vorbei. Beide Angaben als
 * `YYYY-MM-DD` — in dieser Schreibweise ist der Textvergleich der Datumsvergleich.
 *
 * Genutzt für die Smartphone-Ansicht der Einsätze, die ohne Filter auskommt und
 * deshalb nur zeigt, was noch bevorsteht.
 */
export function isUpcoming(startDay: string, today: string): boolean {
  return startDay >= today;
}

/** Gehört ein Einsatz in die aktuelle Auswahl? */
export function matchesYear(
  missionYear: number,
  isFuture: boolean,
  selection: YearSelection,
  currentYear: number,
): boolean {
  if (selection === "alle") return true;
  if (selection === "aktuell") return missionYear === currentYear || isFuture;
  return missionYear === selection;
}
