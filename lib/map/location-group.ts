// Mehrere Einsätze am selben Ort teilen sich auf der Karte einen Punkt. Ohne
// diese Gruppierung sähe man nur den zuletzt gezeichneten Einsatz und käme an
// die anderen nicht heran. Das Popup wird dadurch zur Galerie: ein Datensatz
// sichtbar, die übrigen desselben Ortes über Pfeile erreichbar.

/**
 * Nachkommastellen, mit denen zwei Koordinaten als „derselbe Ort" gelten.
 * Zwei Stellen sind rund ein Kilometer — und damit genau die Auflösung, ab der
 * zwei Punkte auch im engsten Kartenausschnitt (DACH, ~15° auf 1000 px)
 * übereinanderliegen. Feiner zu prüfen hieße: Punkte, die der Betrachter als
 * einen sieht, blieben getrennt und wären weiter unerreichbar.
 */
export const LOCATION_PRECISION = 2;

/** Schlüssel, unter dem Einsätze als „am selben Ort" zusammenfallen. */
export function locationKey(lat: number, lon: number): string {
  const round = (v: number) => {
    const r = Number(v.toFixed(LOCATION_PRECISION));
    // `-0` und `0` sind derselbe Ort, ergäben als Text aber zwei Schlüssel.
    return Object.is(r, -0) ? 0 : r;
  };
  return `${round(lat)},${round(lon)}`;
}

export interface LocatedMission {
  id: string;
  lat: number;
  lon: number;
  /** Tag des Einsatzes als `YYYY-MM-DD` — sortierbar als Text. */
  startDay: string;
}

/**
 * Alle Einsätze am selben Ort wie der gewählte, neuester zuerst. Der gewählte
 * Einsatz ist immer enthalten; bei gleichem Datum entscheidet die Id, damit die
 * Reihenfolge stabil bleibt und die Pfeile nicht springen.
 */
export function missionsAtSameLocation<T extends LocatedMission>(
  missions: readonly T[],
  selectedId: string,
): T[] {
  const selected = missions.find((m) => m.id === selectedId);
  if (!selected) return [];
  const key = locationKey(selected.lat, selected.lon);
  return missions
    .filter((m) => locationKey(m.lat, m.lon) === key)
    .sort((a, b) => (a.startDay === b.startDay ? a.id.localeCompare(b.id) : b.startDay.localeCompare(a.startDay)));
}

/**
 * Nächster Index in einer endlosen Galerie: hinter dem letzten Eintrag kommt
 * wieder der erste, vor dem ersten der letzte.
 */
export function stepIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (((current + delta) % length) + length) % length;
}
