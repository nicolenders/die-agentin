import type { PlanEntry, PlanKind } from "@/lib/queries/planning";

// Filter und Sortierung des Terminkalenders. Reine Logik — die Seite reicht nur
// die Suchparameter durch, damit sich das Verhalten prüfen lässt, ohne eine
// Datenbank zu brauchen.

export const PLAN_TYPES = ["alle", "mission", "dispatch", "task"] as const;
export type PlanTypeFilter = (typeof PLAN_TYPES)[number];

export const PLAN_TIMES = ["kommend", "vergangen", "alle"] as const;
export type PlanTimeFilter = (typeof PLAN_TIMES)[number];

export const PLAN_SORTS = ["date", "title", "status", "updated"] as const;
export type PlanSort = (typeof PLAN_SORTS)[number];

export interface PlanFilter {
  type: PlanTypeFilter;
  time: PlanTimeFilter;
  /** Statuswert (ContentStatus bzw. OPEN/DONE); leer heißt „alle". */
  status: string;
}

function isOneOf<T extends readonly string[]>(allowed: T, value: unknown): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function toPlanType(value: string | undefined): PlanTypeFilter {
  return isOneOf(PLAN_TYPES, value) ? value : "alle";
}

export function toPlanTime(value: string | undefined): PlanTimeFilter {
  return isOneOf(PLAN_TIMES, value) ? value : "kommend";
}

export function toPlanSort(value: string | undefined): PlanSort {
  return isOneOf(PLAN_SORTS, value) ? value : "date";
}

/** Tagesgenauer Vergleich: Was heute stattfindet, gehört zu „kommend". */
function startOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function filterPlanEntries(
  entries: PlanEntry[],
  filter: PlanFilter,
  now: Date = new Date(),
): PlanEntry[] {
  const today = startOfDay(now);
  return entries.filter((e) => {
    if (filter.type !== "alle" && e.kind !== (filter.type as PlanKind)) return false;
    if (filter.status && e.status !== filter.status) return false;
    if (filter.time !== "alle") {
      // Einträge ohne Datum sind ungeplant — sie stehen bei „kommend", weil sie
      // auf eine Entscheidung warten, und nicht in der Vergangenheit.
      if (!e.date) return filter.time === "kommend";
      const day = startOfDay(e.date);
      if (filter.time === "kommend" && day < today) return false;
      if (filter.time === "vergangen" && day >= today) return false;
    }
    return true;
  });
}

export function sortPlanEntries(entries: PlanEntry[], sort: PlanSort): PlanEntry[] {
  const copy = [...entries];
  copy.sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title, "de");
    if (sort === "status") return a.status.localeCompare(b.status);
    if (sort === "updated") return b.updatedAt.getTime() - a.updatedAt.getTime();
    // Ohne Datum ans Ende: ein ungeplanter Eintrag verdrängt keinen Termin.
    const at = a.date?.getTime() ?? Number.POSITIVE_INFINITY;
    const bt = b.date?.getTime() ?? Number.POSITIVE_INFINITY;
    return at - bt;
  });
  return copy;
}

/** Offene, überfällige Berichts-Aufgaben — die Zahl neben dem Filter. */
export function countOverdueTasks(entries: PlanEntry[]): number {
  return entries.filter((e) => e.kind === "task" && e.task?.overdue).length;
}
