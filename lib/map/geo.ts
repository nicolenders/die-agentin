import { geoNaturalEarth1, geoPath, geoGraticule10, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import topoData from "world-atlas/land-110m.json";

// Kartengrundlage (SPEC §2, §10): d3-geo + gebündeltes world-atlas TopoJSON,
// als SVG gerendert. Keine Tile-Provider, keine Drittanbieter-Requests.

// Das TopoJSON ist statisch; die Typen von topojson-client sind hier zu streng,
// daher ein gezielter Cast in genau dieser Hilfsdatei.
/* eslint-disable @typescript-eslint/no-explicit-any */
const landFeature = feature(topoData as any, (topoData as any).objects.land) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface GeoResult {
  projection: GeoProjection;
  landPath: string;
  graticulePath: string;
}

/** Erzeugt Projektion und Pfade für eine Weltkarte der Größe W×H. */
export function computeGeo(width: number, height: number): GeoResult {
  const projection = geoNaturalEarth1().fitExtent(
    [
      [6, 6],
      [width - 6, height - 6],
    ],
    { type: "Sphere" },
  );
  const path = geoPath(projection);
  return {
    projection,
    landPath: path(landFeature) ?? "",
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
