import "server-only";
import { db } from "@/lib/db";

// Auswertung der Reichweiten-Erfassung für die Redaktion. Direkte Aggregation
// (kein Cache — die Zahlen sollen aktuell sein). Alle Fehler werden abgefangen,
// damit ein DB-Kaltstart die Admin-Seite nicht bricht (leere Auswertung).

export interface AnalyticsFilter {
  from: Date;
  to: Date; // exklusiv-oberer Tag wird vom Aufrufer als „bis einschließlich" gesetzt
  country: string | null;
}

export interface Bucket {
  key: string;
  views: number;
}

export interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  byDay: Bucket[];
  byPath: Bucket[];
  bySection: Bucket[];
  byCountry: Bucket[];
  countries: string[]; // für das Länder-Filter-Dropdown (Zeitraum, ohne Länderfilter)
  available: boolean; // false, wenn die DB nicht erreichbar war
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const EMPTY: AnalyticsSummary = {
  totalViews: 0,
  uniqueVisitors: 0,
  byDay: [],
  byPath: [],
  bySection: [],
  byCountry: [],
  countries: [],
  available: false,
};

export async function getAnalyticsSummary(filter: AnalyticsFilter): Promise<AnalyticsSummary> {
  const where = {
    day: { gte: filter.from, lte: filter.to },
    ...(filter.country ? { country: filter.country } : {}),
  };

  try {
    const [totalViews, visitorGroups, dayGroups, pathGroups, sectionGroups, countryGroups, allCountryGroups] =
      await Promise.all([
        db.pageview.count({ where }),
        db.pageview.groupBy({ by: ["visitorHash"], where }),
        db.pageview.groupBy({ by: ["day"], where, _count: { _all: true }, orderBy: { day: "asc" } }),
        db.pageview.groupBy({ by: ["path"], where, _count: { _all: true } }),
        db.pageview.groupBy({ by: ["section"], where, _count: { _all: true } }),
        db.pageview.groupBy({ by: ["country"], where, _count: { _all: true } }),
        // Dropdown-Optionen: alle Länder im Zeitraum, unabhängig vom aktuellen Länderfilter.
        db.pageview.groupBy({
          by: ["country"],
          where: { day: { gte: filter.from, lte: filter.to } },
          _count: { _all: true },
        }),
      ]);

    const byDay: Bucket[] = dayGroups.map((g) => ({ key: isoDay(g.day), views: g._count._all }));
    const sortDesc = (a: Bucket, b: Bucket) => b.views - a.views;
    const byPath: Bucket[] = pathGroups
      .map((g) => ({ key: g.path, views: g._count._all }))
      .sort(sortDesc)
      .slice(0, 40);
    const bySection: Bucket[] = sectionGroups
      .map((g) => ({ key: g.section, views: g._count._all }))
      .sort(sortDesc);
    const byCountry: Bucket[] = countryGroups
      .map((g) => ({ key: g.country, views: g._count._all }))
      .sort(sortDesc);
    const countries = allCountryGroups
      .map((g) => g.country)
      .sort((a, b) => a.localeCompare(b));

    return {
      totalViews,
      uniqueVisitors: visitorGroups.length,
      byDay,
      byPath,
      bySection,
      byCountry,
      countries,
      available: true,
    };
  } catch {
    return EMPTY;
  }
}
