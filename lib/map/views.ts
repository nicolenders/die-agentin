import type { GeoBounds } from "@/lib/map/geo";

// Karten-Ansichten (SPEC §11): kein echter Zoom, sondern feste Ausschnitte —
// die ganze Welt, einzelne Kontinente und die DACH-Region. Kontinente ohne
// Einsätze werden im UI ausgeblendet (siehe `availableViews`); Welt und DACH
// sind immer wählbar.
export interface MapViewDef {
  id: string;
  labelDe: string;
  labelEn: string;
  bounds: GeoBounds; // null = ganze Welt
  always?: boolean; // immer anbieten, auch ohne Einsätze in der Region
  countries?: string[]; // nur diese Länder zeichnen (ISO-3166-1 numerisch), sonst ganze Landmasse
}

export const MAP_VIEWS: MapViewDef[] = [
  { id: "welt", labelDe: "Welt", labelEn: "World", bounds: null, always: true },
  { id: "europa", labelDe: "Europa", labelEn: "Europe", bounds: [[-25, 34], [45, 72]] },
  { id: "nordamerika", labelDe: "Nordamerika", labelEn: "North America", bounds: [[-168, 7], [-52, 72]] },
  { id: "suedamerika", labelDe: "Südamerika", labelEn: "South America", bounds: [[-82, -56], [-34, 13]] },
  { id: "afrika", labelDe: "Afrika", labelEn: "Africa", bounds: [[-20, -35], [52, 38]] },
  { id: "asien", labelDe: "Asien", labelEn: "Asia", bounds: [[40, 5], [150, 78]] },
  { id: "ozeanien", labelDe: "Ozeanien", labelEn: "Oceania", bounds: [[110, -48], [180, 3]] },
  // DACH: nur Deutschland (276), Österreich (040) und die Schweiz (756) zeichnen.
  {
    id: "dach",
    labelDe: "DACH",
    labelEn: "DACH",
    bounds: [[5, 45.5], [17.5, 55.5]],
    always: true,
    countries: ["276", "040", "756"],
  },
];

/** Liegt ein Punkt im Rechteck der Ansicht? `null`-Bounds (Welt) umfasst alles. */
export function inBounds(bounds: GeoBounds, lon: number, lat: number): boolean {
  if (!bounds) return true;
  const [[minLon, minLat], [maxLon, maxLat]] = bounds;
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

/**
 * Ansichten, die angeboten werden: immer die `always`-Ansichten (Welt, DACH),
 * plus jede Region, in der mindestens ein Einsatz liegt. Reihenfolge wie in
 * MAP_VIEWS.
 */
export function availableViews(points: { lon: number; lat: number }[]): MapViewDef[] {
  return MAP_VIEWS.filter(
    (v) => v.always || points.some((p) => inBounds(v.bounds, p.lon, p.lat)),
  );
}
