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
  onlineToggle: string;
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
}

const STORE_KEY = "einsaetze:filter";
const DEFAULT_STATE: FilterState = { q: "", year: "alle", ids: [], showOnline: true };

function readFromSearch(search: string): FilterState | null {
  const p = new URLSearchParams(search);
  if (!p.has("jahr") && !p.has("identitaet") && !p.has("q") && !p.has("online")) return null;
  return {
    q: p.get("q") ?? "",
    year: p.get("jahr") ?? "alle",
    ids: (p.get("identitaet") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    showOnline: p.get("online") !== "0",
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
    const qs = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [state, mounted]);

  const years = useMemo(
    () => [...new Set(missions.map((m) => m.year))].sort((a, b) => b - a),
    [missions],
  );
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
          (!needle || `${m.eventName} ${m.city} ${m.countryCode}`.toLowerCase().includes(needle)),
      ),
    [missions, state.showOnline, state.ids, selection, currentYear, needle],
  );

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
    state.q === "" && state.year === "alle" && state.ids.length === 0 && state.showOnline;

  const set = (patch: Partial<FilterState>) => setState((s) => ({ ...s, ...patch }));

  // Filterleiste — bewusst zweimal (über der Karte und über der Tabelle)
  // gerendert; beide teilen sich denselben Zustand und bleiben synchron.
  const controls = (idPrefix: string) => (
    <div className="filter-row" style={{ marginTop: 8, alignItems: "center" }}>
      <input
        id={`${idPrefix}-q`}
        className="f"
        type="search"
        placeholder={labels.search}
        aria-label={labels.search}
        value={state.q}
        onChange={(e) => set({ q: e.target.value })}
        style={{ maxWidth: 260 }}
      />
      <label className="meta" htmlFor={`${idPrefix}-year`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {labels.yearLabel}
        <select
          id={`${idPrefix}-year`}
          className="f"
          value={state.year}
          onChange={(e) => set({ year: e.target.value })}
        >
          <option value="alle">{labels.yearAll}</option>
          <option value="aktuell">{labels.yearCurrent}</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="meta" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <input
          type="checkbox"
          checked={state.showOnline}
          onChange={(e) => set({ showOnline: e.target.checked })}
        />
        {labels.onlineToggle}
      </label>
      {!isDefault ? (
        <button type="button" className="btn ghost sm" onClick={() => setState(DEFAULT_STATE)}>
          {labels.reset}
        </button>
      ) : null}
      <span className="meta" style={{ marginLeft: "auto" }}>
        {filtered.length}/{missions.length} {labels.missionsWord}
      </span>
    </div>
  );

  return (
    <div>
      {controls("top")}

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

      <div style={{ marginTop: 14 }}>
        {mapMissions.length > 0 ? (
          <WorldMap missions={mapMissions} locale={locale} labels={labels.map} />
        ) : (
          <div className="card bracket">
            <p className="muted" style={{ margin: 0 }}>{labels.empty}</p>
          </div>
        )}
      </div>

      <p className="eyebrow" style={{ marginTop: 44 }}>{labels.listTitle}</p>
      {controls("bottom")}
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
