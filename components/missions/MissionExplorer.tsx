"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import WorldMap, { type MapMission } from "@/components/map/WorldMap";
import { availableViews, matchesView } from "@/lib/map/views";
import { matchesYear, parseYearSelection, type YearSelection } from "@/lib/missions";
import { useIsPhone } from "@/lib/hooks/use-media-query";
import { toggleCsv } from "@/lib/filters";
import { talkLanguageLabel } from "@/lib/mission-language";
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
  /** Tag des Einsatzes als `YYYY-MM-DD` — für „heute oder später". */
  startDay: string;
  dateLabel: string;
  eventUrl: string | null;
  published: boolean;
  caseFilePublic: boolean;
  bannerUrl: string | null;
  bannerAlt: string;
  bannerAi: boolean;
  identitySlugs: string[];
  identities: { slug: string; name: string; color: string }[];
  tools: { slug: string; name: string }[];
  briefing: { id: string; title: string } | null;
  /** Vortragssprache dieses Einsatzes („de"/„en"). */
  language: string | null;
  durationMin: number | null;
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
  colBriefing: string;
  colLanguage: string;
  colLocation: string;
  colStatus: string;
  statusPlanned: string;
  statusDone: string;
  onlineLocation: string;
  empty: string;
  /** Hinweis am Telefon, wo ohne Filter nur Anstehendes gezeigt wird. */
  /** Hinweis am Telefon, warum zunächst nur das laufende Jahr zu sehen ist. */
  phoneNote: string;
  map: {
    aiGenerated: string;
    aiGeneratedImage: string;
    all: string;
    done: string;
    planned: string;
    size: string;
    open: string;
    view: string;
    briefing: string;
    identity: string;
    language: string;
    openFile: string;
    online: string;
    duration: string;
    showOnMap: string;
  };
}

/** Weltkugel — führt den Einsatz auf der Karte vor. */
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.3 9h17.4M3.3 15h17.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

interface FilterState {
  q: string;
  year: string; // "aktuell" | "alle" | Jahreszahl
  ids: string[];
  showOnline: boolean;
  werkzeug: string; // Werkzeug-Slug oder "" (kein Werkzeug-Filter)
  /** Kartenausschnitt (Welt/Kontinent/DACH) — filtert auch die Liste. */
  view: string;
}

const STORE_KEY = "einsaetze:filter";
// `year: ""` heißt „noch nicht gewählt". Erst daraus wird die Vorgabe abgeleitet
// — und die ist am Telefon eine andere als am großen Bildschirm.
const DEFAULT_STATE: FilterState = {
  q: "",
  year: "",
  ids: [],
  showOnline: true,
  werkzeug: "",
  view: "welt",
};

function readFromSearch(search: string): FilterState | null {
  const p = new URLSearchParams(search);
  if (
    !p.has("jahr") &&
    !p.has("identitaet") &&
    !p.has("q") &&
    !p.has("online") &&
    !p.has("werkzeug") &&
    !p.has("ansicht")
  ) {
    return null;
  }
  return {
    q: p.get("q") ?? "",
    year: p.get("jahr") ?? "",
    ids: (p.get("identitaet") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    showOnline: p.get("online") !== "0",
    werkzeug: p.get("werkzeug") ?? "",
    view: p.get("ansicht") ?? "welt",
  };
}

function readFromStore(): FilterState | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FilterState>;
    return {
      q: typeof parsed.q === "string" ? parsed.q : "",
      year: typeof parsed.year === "string" ? parsed.year : "",
      ids: Array.isArray(parsed.ids) ? parsed.ids.filter((x): x is string => typeof x === "string") : [],
      showOnline: parsed.showOnline !== false,
      werkzeug: typeof parsed.werkzeug === "string" ? parsed.werkzeug : "",
      view: typeof parsed.view === "string" ? parsed.view : "welt",
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
  // Auf der Karte ausgewählter Einsatz (Popup). Liegt hier, weil ihn sowohl die
  // Karte als auch die Tabelle darunter setzt.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Beim Aufbau: erst URL (teilbarer Deep-Link), sonst die zuletzt genutzten
  // Einstellungen aus der Sitzung. Server und erste Client-Ausgabe nutzen die
  // Standardwerte, damit es keine Hydration-Abweichung gibt.
  /* eslint-disable react-hooks/set-state-in-effect -- Einmalige Wiederherstellung
     des Filterzustands aus URL bzw. Sitzungsspeicher beim Aufbau. Server und
     erste Client-Ausgabe nutzen die Standardwerte; erst danach wird der externe
     Speicher gelesen, damit es keine Hydration-Abweichung gibt. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get("einsatz");
    const fromUrl = readFromSearch(window.location.search);
    // Kommt jemand mit einem verlinkten Einsatz (z. B. „Auf der Karte zeigen"
    // von der Startseite), zählen die zuletzt genutzten Filter nicht: der
    // Einsatz soll sichtbar sein, nicht von einem alten Jahresfilter verdeckt.
    const initial = wanted ? (fromUrl ?? DEFAULT_STATE) : (fromUrl ?? readFromStore() ?? DEFAULT_STATE);
    setState(initial);
    if (wanted) setSelectedId(wanted);
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
    if (state.view && state.view !== "welt") p.set("ansicht", state.view);
    // Auch die Auswahl steht in der URL — so lässt sich ein Einsatz samt
    // geöffnetem Popup verlinken (genau das nutzt die Startseite).
    if (selectedId) p.set("einsatz", selectedId);
    const qs = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [state, selectedId, mounted]);

  const years = useMemo(
    () => [...new Set(missions.map((m) => m.year))].sort((a, b) => b - a),
    [missions],
  );

  // Ansichten aus dem gesamten Bestand, nicht aus der gefilterten Auswahl: sonst
  // verschwindet der Knopf, mit dem man gerade gefiltert hat.
  const views = useMemo(() => availableViews(missions), [missions]);
  const activeView = views.find((v) => v.id === state.view) ?? views[0] ?? null;
  const currentYear = new Date().getUTCFullYear();
  const needle = state.q.trim().toLowerCase();

  // Am Telefon gelten dieselben Filter wie sonst — nur die Vorgabe ist eine
  // andere: das laufende Jahr statt aller Jahre. Vorher zeigte das Telefon
  // ausschließlich Anstehendes und bot keinen Filter an; wer dort nach einem
  // Einsatz von letztem Jahr suchte, fand ihn schlicht nicht.
  const isPhone = useIsPhone();
  const yearValue = state.year || (isPhone ? String(currentYear) : "alle");
  const selection: YearSelection = parseYearSelection(yearValue);

  const filtered = useMemo(
    () =>
      missions.filter(
        (m) =>
          matchesView(activeView, m) &&
          (state.showOnline || !m.isOnline) &&
          matchesYear(m.year, m.future, selection, currentYear) &&
          (state.ids.length === 0 || m.identitySlugs.some((s) => state.ids.includes(s))) &&
          (!state.werkzeug || m.tools.some((t) => t.slug === state.werkzeug)) &&
          (!needle || `${m.eventName} ${m.city} ${m.countryCode}`.toLowerCase().includes(needle)),
      ),
    [missions, activeView, state.showOnline, state.ids, state.werkzeug, selection, currentYear, needle],
  );

  // Fällt der ausgewählte Einsatz durch einen Filter heraus, gilt er als nicht
  // ausgewählt — abgeleitet statt nachträglich zurückgesetzt, damit die Karte
  // nie kurz etwas zeigt, das in der Liste darunter schon nicht mehr steht.
  const shownSelectedId = selectedId && filtered.some((m) => m.id === selectedId) ? selectedId : null;

  /** Einsatz auswählen und die Karte in den Blick holen. */
  function selectMission(id: string | null) {
    setSelectedId(id);
    if (id) mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Anzeigename des aktiven Werkzeug-Filters (aus den Einsätzen, sonst der Slug).
  const werkzeugName = useMemo(() => {
    if (!state.werkzeug) return "";
    for (const m of missions) {
      const t = m.tools.find((x) => x.slug === state.werkzeug);
      if (t) return t.name;
    }
    return state.werkzeug;
  }, [missions, state.werkzeug]);

  // Online-Einsätze sind mit auf der Karte (sie sitzen in der Antarktis) —
  // ausgeblendet werden sie nur über den Online-Filter.
  const mapMissions: MapMission[] = filtered.map((m) => ({
    id: m.id,
    slug: m.slug,
    eventName: m.eventName,
    city: m.isOnline ? labels.onlineLocation : `${m.city}, ${m.countryCode}`,
    countryCode: m.countryCode,
    lat: m.lat,
    lon: m.lon,
    year: m.year,
    future: m.future,
    isOnline: m.isOnline,
    dateLabel: m.dateLabel,
    eventUrl: m.eventUrl,
    published: m.published,
    caseFilePublic: m.caseFilePublic,
    bannerUrl: m.bannerUrl,
    bannerAlt: m.bannerAlt,
    bannerAi: m.bannerAi,
    identities: m.identities,
    briefing: m.briefing,
    language: m.language,
    durationMin: m.durationMin,
  }));

  const isDefault =
    state.q === "" &&
    state.year === "" &&
    state.ids.length === 0 &&
    state.showOnline &&
    state.werkzeug === "" &&
    state.view === "welt";

  /** Ausschnitt wechseln. Das Popup schließt: der Pin liegt evtl. außerhalb. */
  function chooseView(id: string) {
    setState((s) => ({ ...s, view: id }));
    setSelectedId(null);
  }

  const set = (patch: Partial<FilterState>) => setState((s) => ({ ...s, ...patch }));

  // Jahres-Blibs: „Alle Jahre" und „Aktuell & geplant" sind immer sichtbar; die
  // einzelnen Jahre klappen erst nach „weitere Jahre" auf (oder wenn ein
  // konkretes Jahr aktiv ist).
  const showYearList = yearsExpanded || (yearValue !== "alle" && yearValue !== "aktuell");
  const yearChip = (value: string, label: string) => (
    <button
      type="button"
      className="chip sm"
      aria-pressed={yearValue === value}
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
      {/* Ausschnitt der Karte — und zugleich Filter der Liste darunter: Wer
          „Europa" wählt, will die europäischen Einsätze sehen, nicht nur einen
          anderen Kartenausschnitt. „Online" steht hier mit, abgesetzt hinter
          DACH: Online-Einsätze haben keinen Ort, gehören aber in dieselbe
          Entscheidung „was sehe ich gerade?". */}
      {views.length > 1 ? (
        <div className="map-filters">
          <div className="year-filter" role="group" aria-label={labels.map.view}>
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                className="chip"
                aria-pressed={activeView?.id === v.id}
                onClick={() => chooseView(v.id)}
              >
                {locale === "de" ? v.labelDe : v.labelEn}
              </button>
            ))}
          </div>
          <div className="year-filter" role="group" aria-label={labels.onlineToggle}>
            <button
              type="button"
              className="chip"
              aria-pressed={state.showOnline}
              onClick={() => set({ showOnline: !state.showOnline })}
            >
              {labels.onlineToggle}
            </button>
          </div>
        </div>
      ) : null}

      {/* Karte mit der Kennzahl (angezeigt/gesamt) oben rechts. */}
      <div className="map-wrap" ref={mapRef}>
        <span className="map-count">
          {filtered.length}/{missions.length} {labels.missionsWord}
        </span>
        {mapMissions.length > 0 ? (
          <WorldMap
            missions={mapMissions}
            locale={locale}
            labels={labels.map}
            view={activeView}
            selectedId={shownSelectedId}
            onSelect={setSelectedId}
          />
        ) : (
          <div className="card bracket">
            <p className="muted" style={{ margin: 0 }}>{labels.empty}</p>
          </div>
        )}
      </div>

      {/* Auch am Telefon: Filter statt einer festen Auswahl. Der Hinweis sagt,
          warum zunächst nur das laufende Jahr zu sehen ist. */}
      {isPhone && !state.year ? (
        <p className="meta" style={{ marginTop: 14, marginBottom: 0 }}>{labels.phoneNote}</p>
      ) : null}
      {filterBlock}

      <p className="eyebrow" style={{ marginTop: 24 }}>{labels.listTitle}</p>
      {filtered.length > 0 ? (
        <table className="stack" role="table" style={{ marginTop: 12 }}>
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">{labels.colDate}</th>
              <th scope="col" role="columnheader">{labels.colEvent}</th>
              <th scope="col" role="columnheader">{labels.colBriefing}</th>
              <th scope="col" role="columnheader">{labels.colLanguage}</th>
              <th scope="col" role="columnheader">{labels.colLocation}</th>
              <th scope="col" role="columnheader">{labels.colStatus}</th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {filtered.map((m) => (
              <tr
                key={m.id}
                role="row"
                className={`mission-row${shownSelectedId === m.id ? " on" : ""}`}
                onClick={(e) => {
                  // Links und Knöpfe in der Zeile behalten ihre eigene Wirkung.
                  if ((e.target as HTMLElement).closest("a, button")) return;
                  selectMission(m.id);
                }}
              >
                <td role="cell" className="meta" data-label={labels.colDate}>{m.dateLabel}</td>
                <td role="cell" data-label={labels.colEvent} data-primary="">
                  {m.published && m.caseFilePublic && m.slug ? (
                    <Link href={`/${locale}/einsaetze/${m.slug}`}>{m.eventName}</Link>
                  ) : (
                    m.eventName
                  )}
                </td>
                <td role="cell" data-label={labels.colBriefing}>
                  {m.briefing ? (
                    <Link href={`/${locale}/briefings?briefing=${m.briefing.id}#briefing-${m.briefing.id}`}>
                      {m.briefing.title}
                    </Link>
                  ) : (
                    <span className="meta">—</span>
                  )}
                </td>
                <td role="cell" className="meta" data-label={labels.colLanguage}>
                  {talkLanguageLabel(m.language, locale) ?? "—"}
                </td>
                <td role="cell" data-label={labels.colLocation}>
                  {/* Der Globus vor dem Ort holt den Einsatz auf die Karte. Als
                      echter Knopf (Tastatur, Screenreader); der Titel nennt die
                      Wirkung, eine eigene Spalte dafür braucht es nicht mehr. */}
                  <span className="location-cell">
                    <button
                      type="button"
                      className="globe-btn"
                      aria-pressed={shownSelectedId === m.id}
                      title={labels.map.showOnMap}
                      aria-label={`${labels.map.showOnMap}: ${m.isOnline ? labels.onlineLocation : m.city}`}
                      onClick={() => selectMission(m.id)}
                    >
                      <GlobeIcon />
                    </button>
                    <span>{m.isOnline ? labels.onlineLocation : `${m.city}, ${m.countryCode}`}</span>
                  </span>
                </td>
                <td role="cell" data-label={labels.colStatus}>{m.future ? labels.statusPlanned : labels.statusDone}</td>
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
