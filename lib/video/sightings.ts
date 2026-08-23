// Filter und Zählwerk der Galerie „Sichtungen". Rein — ohne Datenbank prüfbar.

export interface SightingLike {
  year: number;
  publisher: string | null;
}

export interface Facet<T> {
  value: T;
  count: number;
}

export interface SightingFacets {
  /** Jahre absteigend — das Jüngste zuerst, wie überall auf der Seite. */
  years: Facet<number>[];
  /** Kanäle alphabetisch. Videos ohne Kanal erscheinen in keiner Gruppe. */
  channels: Facet<string>[];
}

/**
 * Welche Jahre und Kanäle kommen vor, und wie oft?
 *
 * Angeboten wird nur, wozu es auch Einträge gibt: Eine Jahreszahl ohne Video
 * dahinter ist eine Schaltfläche, die auf eine leere Seite führt.
 */
export function sightingFacets(items: SightingLike[]): SightingFacets {
  const years = new Map<number, number>();
  const channels = new Map<string, number>();
  for (const item of items) {
    years.set(item.year, (years.get(item.year) ?? 0) + 1);
    if (item.publisher) channels.set(item.publisher, (channels.get(item.publisher) ?? 0) + 1);
  }
  return {
    years: [...years.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.value - a.value),
    channels: [...channels.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, "de")),
  };
}

/**
 * Filtert nach Jahr und Kanal. Ein leerer Wert heißt „alle" — nicht „keine";
 * das ist der Unterschied zwischen einer offenen und einer leeren Galerie.
 */
export function filterSightings<T extends SightingLike>(
  items: T[],
  filter: { year?: string; channel?: string },
): T[] {
  const year = Number.parseInt(filter.year ?? "", 10);
  const hasYear = Number.isInteger(year);
  const channel = filter.channel ?? "";
  return items.filter(
    (item) => (!hasYear || item.year === year) && (!channel || item.publisher === channel),
  );
}

export interface YearGroup<T> {
  year: number;
  items: T[];
}

/**
 * Nach Jahrgängen bündeln, das jüngste zuerst.
 *
 * Die Galerie ist eine lange Liste, durch die man scrollt statt zu filtern.
 * Ohne Zwischenüberschriften verliert man dabei jedes Gefühl dafür, wo man ist;
 * mit ihnen wird aus der Liste eine Chronik. Innerhalb eines Jahres bleibt die
 * Reihenfolge, in der die Einträge hereinkommen — die Datenbank sortiert sie
 * bereits.
 */
export function groupByYear<T extends SightingLike>(items: T[]): YearGroup<T>[] {
  const groups = new Map<number, T[]>();
  for (const item of items) {
    const bucket = groups.get(item.year);
    if (bucket) bucket.push(item);
    else groups.set(item.year, [item]);
  }
  return [...groups.entries()]
    .map(([year, list]) => ({ year, items: list }))
    .sort((a, b) => b.year - a.year);
}
