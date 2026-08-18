// Reihenfolge des öffentlichen Briefing-Katalogs (Audit 4.1).
//
// Vorher entschied `sortOrder` allein. Das ist tückisch: `reorderTalk` im Admin
// schreibt beim ersten Verschieben eine laufende Nummer über ALLE Briefings,
// und von da an lag die Reihenfolge fest — unabhängig davon, wie oft ein
// Vortrag tatsächlich gehalten wurde. Auf einer Seite, deren stärkstes Signal
// die Häufigkeit ist, stand damit 3× vor 5× vor 1×.
//
// Jetzt führt die Häufigkeit. Die manuelle Reihenfolge bleibt als Feinschliff
// erhalten und greift bei gleicher Häufigkeit — dort, wo sie gebraucht wird:
// unter den vielen noch nicht gehaltenen Briefings.

export interface SortableBriefing {
  /** Anzahl der Einsätze, bei denen das Briefing gehalten wurde. */
  total: number;
  /** Manuelle Reihenfolge aus dem Admin. */
  sortOrder: number;
  title: string;
}

/** Vergleicht zwei Briefings: Häufigkeit, dann manuelle Reihenfolge, dann Titel. */
export function compareBriefings(a: SortableBriefing, b: SortableBriefing, locale: string): number {
  return (
    b.total - a.total ||
    a.sortOrder - b.sortOrder ||
    a.title.localeCompare(b.title, locale)
  );
}

/** Sortierte Kopie der Liste. */
export function sortBriefings<T extends SortableBriefing>(items: T[], locale: string): T[] {
  return [...items].sort((a, b) => compareBriefings(a, b, locale));
}
