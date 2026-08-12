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
