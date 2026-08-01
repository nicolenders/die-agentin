"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { computeGeo, project } from "@/lib/map/geo";
import type { Locale } from "@/lib/i18n/config";

const W = 1000;
const H = 500;

export interface MapMission {
  id: string;
  slug: string | null;
  eventName: string;
  city: string;
  countryCode: string;
  lat: number;
  lon: number;
  year: number;
  future: boolean;
  dateLabel: string;
  eventUrl: string | null;
}

type Filter = "alle" | "geplant" | string;

// Weltkarte (SPEC §11). Interaktiv, aber Beiwerk: die vollständige Tabelle unter
// der Karte ist immer sichtbar (in der Seite, nicht hier). Pins sind
// fokussierbar und per Enter aktivierbar.
export default function WorldMap({
  missions,
  locale,
  labels,
}: {
  missions: MapMission[];
  locale: Locale;
  labels: { done: string; planned: string; size: string; sample: string; open: string; all: string };
}) {
  const { landPath, graticulePath, projection } = useMemo(() => computeGeo(W, H), []);
  const [filter, setFilter] = useState<Filter>("alle");
  const [selected, setSelected] = useState<MapMission | null>(null);

  const years = useMemo(
    () => [...new Set(missions.map((m) => m.year))].sort((a, b) => b - a),
    [missions],
  );

  const visible = missions.filter((m) => {
    if (filter === "alle") return true;
    if (filter === "geplant") return m.future;
    return String(m.year) === filter;
  });

  const chip = (value: Filter, label: string) => (
    <button
      key={value}
      className="chip"
      aria-pressed={filter === value}
      onClick={() => setFilter(value)}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="year-filter" role="group" aria-label={locale === "de" ? "Jahr filtern" : "Filter by year"}>
        {chip("alle", labels.all)}
        {chip("geplant", labels.planned)}
        {years.map((y) => chip(String(y), String(y)))}
      </div>

      <div className="map-shell" style={{ position: "relative" }}>
        <svg
          className="map"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={
            locale === "de"
              ? "Weltkarte mit Einsatzorten. Eine barrierefreie Liste aller Einsätze steht direkt unter der Karte."
              : "World map of mission locations. An accessible list of all missions is right below the map."
          }
        >
          <path className="graticule" d={graticulePath} />
          <path className="landmass" d={landPath} />
          <g>
            {visible.map((m) => {
              const [x, y] = project(projection, m.lon, m.lat);
              return (
                <g
                  key={m.id}
                  className={`pin${m.future ? " future" : ""}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${m.eventName}, ${m.city}, ${m.dateLabel}`}
                  onClick={() => setSelected(m)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(m);
                    }
                  }}
                >
                  <circle className="halo" cx={x} cy={y} r={3} />
                  <circle className="core" cx={x} cy={y} r={3.2} />
                </g>
              );
            })}
          </g>
        </svg>

        {selected
          ? (() => {
              const [x, y] = project(projection, selected.lon, selected.lat);
              return (
                <div
                  className="popup"
                  style={{
                    left: `min(max(${(x / W) * 100}% - 132px, 8px), calc(100% - 272px))`,
                    top: `max(${(y / H) * 100}% - 150px, 8px)`,
                  }}
                >
                  <button className="close" aria-label={locale === "de" ? "Schließen" : "Close"} onClick={() => setSelected(null)}>
                    ×
                  </button>
                  <p className="meta" style={{ margin: 0 }}>
                    {selected.dateLabel} · {selected.city}
                    {selected.future ? ` · ${labels.planned.toUpperCase()}` : ""}
                  </p>
                  <h4>{selected.eventName}</h4>
                  {selected.eventUrl ? (
                    <p className="meta" style={{ margin: "0 0 10px" }}>
                      <a href={selected.eventUrl} target="_blank" rel="noopener noreferrer">
                        {labels.open} ↗
                      </a>
                    </p>
                  ) : null}
                  {selected.slug ? (
                    <Link className="btn" href={`/${locale}/einsaetze/${selected.slug}`} style={{ width: "100%", justifyContent: "center", padding: "9px 14px" }}>
                      {locale === "de" ? "Einsatzakte öffnen" : "Open mission file"}
                    </Link>
                  ) : null}
                </div>
              );
            })()
          : null}

        <div className="map-legend">
          <span>
            <span style={{ color: "var(--magenta)" }}>●</span> {labels.done}
          </span>
          <span>
            <span style={{ color: "var(--signal)" }}>●</span> {labels.planned}
          </span>
          <span style={{ marginLeft: "auto" }}>{labels.sample}</span>
        </div>
      </div>
    </div>
  );
}
