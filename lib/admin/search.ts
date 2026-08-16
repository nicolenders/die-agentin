// Reine Logik der globalen Adminsuche: welche Bereiche es gibt, wie ein
// Suchbegriff normalisiert wird und wie Treffer sortiert werden. Der
// Datenbankzugriff liegt in `lib/queries/admin-search.ts` — hier steht nur das,
// was sich ohne Datenbank prüfen lässt.

export const SEARCH_ENTITIES = [
  "mission",
  "briefing",
  "dispatch",
  "identity",
  "publication",
  "certification",
  "focus",
  "media",
] as const;

export type SearchEntity = (typeof SEARCH_ENTITIES)[number];

export const ENTITY_LABEL: Record<SearchEntity, string> = {
  mission: "Einsätze",
  briefing: "Briefings",
  dispatch: "Depeschen",
  identity: "Identitäten",
  publication: "Publikationen",
  certification: "Ausbildung & Auszeichnungen",
  focus: "Aufklärung (Radar)",
  media: "Medien",
};

export interface SearchHit {
  entity: SearchEntity;
  id: string;
  title: string;
  /** Zweite Zeile: Ort, Kategorie, Datum — was den Treffer einordnet. */
  detail: string;
  /** Status-Kürzel für das Badge, z. B. „PUBLISHED". Leer = kein Badge. */
  status: string;
  /** Ziel im Adminbereich (Bearbeiten-Maske, wenn es eine gibt). */
  href: string;
}

/** Kleinschreibung + gestutzte Ränder — die Basis jedes Vergleichs. */
export function normalizeQuery(raw: string | undefined | null): string {
  return (raw ?? "").trim().toLowerCase();
}

/** Ab zwei Zeichen wird gesucht; darunter ist jedes Ergebnis Rauschen. */
export const MIN_QUERY_LENGTH = 2;

export function isSearchable(raw: string | undefined | null): boolean {
  return normalizeQuery(raw).length >= MIN_QUERY_LENGTH;
}

/** Prüft, ob ein Wert ein gültiger Bereichsfilter ist. */
export function toSearchEntity(raw: string | undefined | null): SearchEntity | null {
  return SEARCH_ENTITIES.find((e) => e === raw) ?? null;
}

/** Enthält irgendeines der Felder den Suchbegriff? */
export function matchesAny(needle: string, fields: (string | null | undefined)[]): boolean {
  if (!needle) return false;
  return fields.some((f) => (f ?? "").toLowerCase().includes(needle));
}

/**
 * Treffer sortieren: erst was mit dem Suchbegriff beginnt, dann alphabetisch.
 * So steht „Copilot Studio" bei der Suche nach „copilot" vor „Agents mit Copilot".
 */
export function rankHits<T extends { title: string }>(hits: T[], needle: string): T[] {
  const q = normalizeQuery(needle);
  return [...hits].sort((a, b) => {
    const aStarts = a.title.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.title.toLowerCase().startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.title.localeCompare(b.title, "de");
  });
}

/** Zählt Treffer je Bereich — Grundlage der Filter-Chips. */
export function countByEntity(hits: SearchHit[]): Record<SearchEntity, number> {
  const counts = Object.fromEntries(SEARCH_ENTITIES.map((e) => [e, 0])) as Record<SearchEntity, number>;
  for (const hit of hits) counts[hit.entity] += 1;
  return counts;
}
