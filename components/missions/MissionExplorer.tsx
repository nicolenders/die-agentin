"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WorldMap, { type MapMission } from "@/components/map/WorldMap";
import { matchesYear, parseYearSelection, type YearSelection } from "@/lib/missions";
import { toggleCsv } from "@/lib/filters";
import type { Locale } from "@/lib/i18n/config";

export interface ExplorerMission {
  id: string;
  slug: string | null;
  eventName: string;
  city: string;
  countryCode: string;
  lat: number;
  lon: number;
  isOnline: boolean;
  year: number;
  future: boolean;
  dateLabel: string;
  eventUrl: string | null;
  published: boolean;
  bannerUrl: string | null;
  bannerAlt: string;
  bannerAi: boolean;
  identitySlugs: string[];
  tools: { slug: string; name: string }[];
}

export interface ExplorerIdentity {
  id: string;
  slug: string;
  name: string;
  color: string;
  portraitUrl: string | null;
}

export interface ExplorerLabels {
  search: string;
  yearLabel: string;
  yearCurrent: string;
  yearAll: string;
  moreYears: string;
  onlineToggle: string;
  toolLabel: string;
  toolClear: string;
  all: string;
  reset: string;
  missionsWord: string;
  listTitle: string;
  colDate: string;
  colEvent: string;
  colLocation: string;
  colStatus: string;
  statusPlanned: string;
  statusDone: string;
  onlineLocation: string;
  empty: string;
  map: { all: string; done: string; planned: string; size: string; open: string; view: string };
}

interface FilterState {
  q: string;
  year: string; // "aktuell" | "alle" | Jahreszahl
  ids: string[];
  showOnline: boolean;
  werkzeug: string; // Werkzeug-Slug oder "" (kein Werkzeug-Filter)
}

const STORE_KEY = "einsaetze:filter";
const DEFAULT_STATE: FilterState = { q: "", year: "alle", ids: [], showOnline: true, werkzeug: "" };

function readFromSearch(search: string): FilterState | null {
  const p = new URLSearchParams(search);
  if (!p.has("jahr") && !p.has("identitaet") && !p.has("q") && !p.has("online") && !p.has("werkzeug")) return null;
  return {
    q: p.get("q") ?? "",
    year: p.get("jahr") ?? "alle",
    ids: (p.get("identitaet") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    showOnline: p.get("online") !== "0",
    werkzeug: p.get("werkzeug") ?? "",
  };
}

function readFromStore(): FilterState | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FilterState>;
    return {
      q: typeof parsed.q === "string" ? parsed.q : "",
      year: typeof parsed.year === "string" ? parsed.year : "alle",
      ids: Array.isArray(parsed.ids) ? parsed.ids.filter((x): x is string => typeof x === "string") : [],
      showOnline: parsed.showOnline !== false,
      werkzeug: typeof parsed.werkzeug === "string" ? parsed.werkzeug : "",
    };
  } catch {
    return null;
  }
}

// Einsätze-Explorer: Karte und Tabelle teilen sich einen Filterzustand (Suche,
// Jahr, Identitäten, Online-Sichtbarkeit). Der Zustand bleibt beim Öffnen eines
// Einsatzes und Zurückkehren erhalten (sessionStorage) und steht zusätzlich in
// der URL, damit er teil- und verlinkbar ist. Standard: „Alle Jahre".
export default function MissionExplorer({
  locale,
  missions,
  identities,
  labels,
}: {
  locale: Locale;
  missions: ExplorerMission[];
  identities: ExplorerIdentity[];
  labels: ExplorerLabels;
}) {
  const [state, setState] = useState<FilterState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);
  const [yearsExpanded, setYearsExpanded] = useState(false);

  // Beim Aufbau: erst URL (teilbarer Deep-Link), sonst die zuletzt genutzten
  // Einstellungen aus der Sitzung. Server und erste Client-Ausgabe nutzen die
  // Standardwerte, damit es keine Hydration-Abweichung gibt.
  /* eslint-disable react-hooks/set-state-in-effect -- Einmalige Wiederherstellung
     des Filterzustands aus URL bzw. Sitzungsspeicher beim Aufbau. Server und
     erste Client-Ausgabe nutzen die Standardwerte; erst danach wird der externe
     Speicher gelesen, damit es keine Hydration-Abweichung gibt. */
  useEffect(() => {
    const fromUrl = readFromSearch(window.location.search);
    const initial = fromUrl ?? readFromStore() ?? DEFAULT_STATE;
    setState(initial);
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Änderungen sichern (Sitzung) und in die URL spiegeln, ohne zu navigieren.
  useEffect(() => {
    if (!mounted) return;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      // Sitzungsspeicher nicht verfügbar → Filter wirkt trotzdem, nur ohne Merken.
    }
    const p = new URLSearchParams();
    if (state.q.trim()) p.set("q", state.q.trim());
    if (state.year && state.year !== "alle") p.set("jahr", state.year);
    if (state.ids.length) p.set("identitaet", state.ids.join(","));
    if (!state.showOnline) p.set("online", "0");
    if (state.werkzeug) p.set("werkzeug", state.werkzeug);
    const qs = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [state, mounted]);

  const years = useMemo(
    () => [...new Set(missions.map((m) => m.year))].sort((a, b) => b - a),
    [missions],
  );
  // Den Online-Filter nur anbieten, wenn es überhaupt Online-Einsätze gibt —
  // sonst wirkt er (zu Recht) folgenlos und verwirrt nur.
  const hasOnline = useMemo(() => missions.some((m) => m.isOnline), [missions]);
  const currentYear = new Date().getUTCFullYear();
  const selection: YearSelection = parseYearSelection(state.year);
  const needle = state.q.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      missions.filter(
        (m) =>
          (state.showOnline || !m.isOnline) &&
          matchesYear(m.year, m.future, selection, currentYear) &&
          (state.ids.length === 0 || m.identitySlugs.some((s) => state.ids.includes(s))) &&
          (!state.werkzeug || m.tools.some((t) => t.slug === state.werkzeug)) &&
          (!needle || `${m.eventName} ${m.city} ${m.countryCode}`.toLowerCase().includes(needle)),
      ),
    [missions, state.showOnline, state.ids, state.werkzeug, selection, currentYear, needle],
  );

  // Anzeigename des aktiven Werkzeug-Filters (aus den Einsätzen, sonst der Slug).
  const werkzeugName = useMemo(() => {
    if (!state.werkzeug) return "";
    for (const m of missions) {
      const t = m.tools.find((x) => x.slug === state.werkzeug);
      if (t) return t.name;
    }
    return state.werkzeug;
  }, [missions, state.werkzeug]);

  const mapMissions: MapMission[] = filtered
    .filter((m) => !m.isOnline)
    .map((m) => ({
      id: m.id,
      slug: m.slug,
      eventName: m.eventName,
      city: `${m.city}, ${m.countryCode}`,
      countryCode: m.countryCode,
      lat: m.lat,
      lon: m.lon,
      year: m.year,
      future: m.future,
      dateLabel: m.dateLabel,
      eventUrl: m.eventUrl,
      published: m.published,
      bannerUrl: m.bannerUrl,
      bannerAlt: m.bannerAlt,
      bannerAi: m.bannerAi,
    }));

  const isDefault =
    state.q === "" && state.year === "alle" && state.ids.length === 0 && state.showOnline && state.werkzeug === "";

  const set = (patch: Partial<FilterState>) => setState((s) => ({ ...s, ...patch }));

  // Jahres-Blibs: „Alle Jahre" und „Aktuell & geplant" sind immer sichtbar; die
  // einzelnen Jahre klappen erst nach „weitere Jahre" auf (oder wenn ein
  // konkretes Jahr aktiv ist).
  const showYearList = yearsExpanded || (state.year !== "alle" && state.year !== "aktuell");
  const yearChip = (value: string, label: string) => (
    <button
      type="button"
      className="chip sm"
      aria-pressed={state.year === value}
      onClick={() => set({ year: value })}
    >
      {label}
    </button>
  );

  // Ein einziger Filterblock zwischen Karte und Tabelle — steuert beide.
  const filterBlock = (
    <div className="einsatz-filter">
      <div className="filter-row">
        <input
          className="f"
          type="search"
          placeholder={labels.search}
          aria-label={labels.search}
          value={state.q}
          onChange={(e) => set({ q: e.target.value })}
          style={{ maxWidth: 260 }}
        />
        <span className="filter-years" role="group" aria-label={labels.yearLabel}>
          {yearChip("alle", labels.yearAll)}
          {yearChip("aktuell", labels.yearCurrent)}
          {showYearList
            ? years.map((y) => yearChip(String(y), String(y)))
            : years.length > 0
              ? (
                <button type="button" className="chip sm" onClick={() => setYearsExpanded(true)}>
                  {labels.moreYears}
                </button>
              )
              : null}
        </span>
        {hasOnline ? (
          <button
            type="button"
            className="chip sm"
            aria-pressed={state.showOnline}
            onClick={() => set({ showOnline: !state.showOnline })}
          >
            {labels.onlineToggle}
          </button>
        ) : null}
        {state.werkzeug ? (
          <button
            type="button"
            className="chip sm"
            aria-pressed="true"
            onClick={() => set({ werkzeug: "" })}
            title={labels.toolClear}
          >
            {labels.toolLabel}: {werkzeugName} ✕
          </button>
        ) : null}
        {!isDefault ? (
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              setState(DEFAULT_STATE);
              setYearsExpanded(false);
            }}
          >
            {labels.reset}
          </button>
        ) : null}
      </div>

      {identities.length > 0 ? (
        <div className="filter-row" role="group" aria-label={labels.all} style={{ marginTop: 8 }}>
          <button
            type="button"
            className="id-chip text-only"
            aria-pressed={state.ids.length === 0}
            aria-current={state.ids.length === 0 ? "true" : undefined}
            onClick={() => set({ ids: [] })}
          >
            {labels.all}
          </button>
          {identities.map((i) => {
            const on = state.ids.includes(i.slug);
            return (
              <button
                key={i.id}
                type="button"
                className="id-chip"
                aria-pressed={on}
                aria-current={on ? "true" : undefined}
                title={i.name}
                onClick={() => set({ ids: toggleCsv(state.ids, i.slug) })}
              >
                {i.portraitUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="id-ava" src={i.portraitUrl} alt="" loading="lazy" />
                ) : (
                  <span className="id-dot" aria-hidden style={{ background: i.color }} />
                )}
                {i.name}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  return (
    <div>
      {/* Karte mit der Kennzahl (angezeigt/gesamt) oben rechts. */}
      <div className="map-wrap">
        <span className="map-count">
          {filtered.length}/{missions.length} {labels.missionsWord}
        </span>
        {mapMissions.length > 0 ? (
          <WorldMap missions={mapMissions} locale={locale} labels={labels.map} />
        ) : (
          <div className="card bracket">
            <p className="muted" style={{ margin: 0 }}>{labels.empty}</p>
          </div>
        )}
      </div>

      {filterBlock}

      <p className="eyebrow" style={{ marginTop: 24 }}>{labels.listTitle}</p>
      {filtered.length > 0 ? (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>{labels.colDate}</th>
              <th>{labels.colEvent}</th>
              <th>{labels.colLocation}</th>
              <th>{labels.colStatus}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td className="meta">{m.dateLabel}</td>
                <td>
                  {m.published && m.slug ? (
                    <Link href={`/${locale}/einsaetze/${m.slug}`}>{m.eventName}</Link>
                  ) : (
                    m.eventName
                  )}
                </td>
                <td>{m.isOnline ? labels.onlineLocation : `${m.city}, ${m.countryCode}`}</td>
                <td>{m.future ? labels.statusPlanned : labels.statusDone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted" style={{ marginTop: 12 }}>{labels.empty}</p>
      )}
    </div>
  );
}
