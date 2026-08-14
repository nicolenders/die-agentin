import { geoNaturalEarth1, geoPath, geoGraticule10, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import topoData from "world-atlas/land-110m.json";
import topoCountries from "world-atlas/countries-110m.json";

// Kartengrundlage (SPEC §2, §10): d3-geo + gebündeltes world-atlas TopoJSON,
// als SVG gerendert. Keine Tile-Provider, keine Drittanbieter-Requests.

// Das TopoJSON ist statisch; die Typen von topojson-client sind hier zu streng,
// daher ein gezielter Cast in genau dieser Hilfsdatei.
/* eslint-disable @typescript-eslint/no-explicit-any */
const landFeature = feature(topoData as any, (topoData as any).objects.land) as any;
const countryFeatures = (
  feature(topoCountries as any, (topoCountries as any).objects.countries) as any
).features as Array<{ id?: string | number; properties?: { name?: string } }>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface GeoResult {
  projection: GeoProjection;
  landPath: string;
  graticulePath: string;
}

// Rechteckiger Ausschnitt in Geokoordinaten: [[minLon, minLat], [maxLon, maxLat]].
// `null` steht für die ganze Welt.
export type GeoBounds = [[number, number], [number, number]] | null;

// Baut ein GeoJSON-Polygon aus einem Lon/Lat-Rechteck, damit d3 die Projektion
// per fitExtent darauf einpassen (= „hineinzoomen") kann.
//
// WICHTIG: Die Ringrichtung muss im Uhrzeigersinn sein. d3-geo interpretiert
// Polygone sphärisch — das Innere liegt links der Laufrichtung. Bei
// gegen-den-Uhrzeigersinn-Wicklung hält d3 das kleine Rechteck für „die ganze
// Welt minus Rechteck", die Bounding-Box wird global und fitExtent zoomt nicht
// (Ergebnis: Kontinent-/DACH-Ansicht blieb auf Weltmaßstab).
function boundsPolygon(bounds: [[number, number], [number, number]]) {
  const [[minLon, minLat], [maxLon, maxLat]] = bounds;
  return {
    type: "Polygon" as const,
    coordinates: [
      [
        [minLon, minLat],
        [minLon, maxLat],
        [maxLon, maxLat],
        [maxLon, minLat],
        [minLon, minLat],
      ],
    ],
  };
}

/**
 * Erzeugt Projektion und Pfade für die Karte der Größe W×H. Ohne `bounds` wird
 * die ganze Welt gezeigt; mit einem Lon/Lat-Rechteck wird auf diese Region
 * eingepasst (Ansichten: Kontinente, DACH). Gleiche Projektion (Natural Earth),
 * nur ein anderer Ausschnitt — keine zusätzlichen Abhängigkeiten.
 */
export function computeGeo(
  width: number,
  height: number,
  bounds: GeoBounds = null,
  countryIds: string[] | null = null,
): GeoResult {
  const fitObject = bounds ? boundsPolygon(bounds) : { type: "Sphere" as const };
  const projection = geoNaturalEarth1().fitExtent(
    [
      [6, 6],
      [width - 6, height - 6],
    ],
    fitObject,
  );
  const path = geoPath(projection);
  // Mit `countryIds` nur diese Länder zeichnen (z. B. DACH = DE/AT/CH), sonst
  // die gesamte Landmasse.
  const geometry = countryIds
    ? {
        type: "FeatureCollection" as const,
        features: countryFeatures.filter((f) => countryIds.includes(String(f.id))),
      }
    : landFeature;
  return {
    projection,
    landPath: path(geometry) ?? "",
    graticulePath: path(geoGraticule10()) ?? "",
  };
}

/** Projiziert [lon, lat] in Pixelkoordinaten. */
export function project(
  projection: GeoProjection,
  lon: number,
  lat: number,
): [number, number] {
  return projection([lon, lat]) ?? [0, 0];
}

export interface CountryPath {
  id: string; // numerische ISO-ID, 3-stellig (z. B. „276")
  name: string; // englischer Ländername (world-atlas)
  path: string; // SVG-Pfad in der Projektion
  centroid: [number, number]; // Pixel-Schwerpunkt (für Beschriftung)
}

/**
 * Alle Länder-Polygone der Weltkarte als SVG-Pfade (für Choropleth-Karten, z. B.
 * die Besucher-Herkunft). Ganze Welt, Natural-Earth-Projektion — identisch zur
 * Einsatz-Karte, keine zusätzlichen Abhängigkeiten.
 */
export function countryPaths(width: number, height: number): CountryPath[] {
  const projection = geoNaturalEarth1().fitExtent(
    [
      [6, 6],
      [width - 6, height - 6],
    ],
    { type: "Sphere" as const },
  );
  const path = geoPath(projection);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return countryFeatures
    .map((f) => ({
      id: String(f.id),
      name: String(f.properties?.name ?? ""),
      path: path(f as any) ?? "",
      centroid: (path.centroid(f as any) as [number, number]) ?? [0, 0],
    }))
    .filter((p) => p.path && p.id !== "undefined");
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
