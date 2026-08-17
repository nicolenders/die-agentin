"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { computeGeo, project } from "@/lib/map/geo";
import { availableViews, inBounds } from "@/lib/map/views";
import AssetImage from "@/components/media/AssetImage";
import { talkLanguageLabel } from "@/lib/mission-language";
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
  isOnline: boolean;
  dateLabel: string;
  eventUrl: string | null;
  published: boolean;
  caseFilePublic: boolean;
  bannerUrl: string | null;
  bannerAlt: string;
  bannerAi: boolean;
  identities: { slug: string; name: string; color: string }[];
  briefing: { id: string; title: string } | null;
  /** Vortragssprache dieses Einsatzes („de"/„en"). */
  language: string | null;
  durationMin: number | null;
}

// Weltkarte (SPEC §11). Interaktiv, aber Beiwerk: die vollständige Tabelle unter
// der Karte ist immer sichtbar (in der Seite, nicht hier). Pins sind
// fokussierbar und per Enter aktivierbar.
export default function WorldMap({
  missions,
  locale,
  labels,
  selectedId = null,
  onSelect,
}: {
  missions: MapMission[];
  locale: Locale;
  /** Von außen gewählter Einsatz (Tabellenzeile, Deep-Link). */
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  labels: {
    done: string;
    planned: string;
    size: string;
    open: string;
    all: string;
    view: string;
    briefing: string;
    identity: string;
    language: string;
    openFile: string;
    online: string;
    duration: string;
  };
}) {
  const [viewId, setViewId] = useState("welt");
  const selected = missions.find((m) => m.id === selectedId) ?? null;
  const select = (id: string | null) => onSelect?.(id);

  // Das Popup ist am Telefon bildschirmfüllend (siehe Stylesheet). Solange es
  // offen ist, bleibt die Seite darunter stehen — sonst scrollt beim Wischen im
  // Popup unbemerkt die Seite weiter, und nach dem Schließen ist man woanders.
  // Escape schließt es, wie es sich für einen Dialog gehört.
  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSelect?.(null);
    };
    document.addEventListener("keydown", onKey);
    const phone = window.matchMedia("(max-width: 640px)").matches;
    const previous = document.body.style.overflow;
    if (phone) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (phone) document.body.style.overflow = previous;
    };
  }, [selected, onSelect]);

  // Nur Ansichten anbieten, in denen Einsätze liegen (Welt und DACH immer).
  const views = useMemo(() => availableViews(missions), [missions]);
  const activeView = views.find((v) => v.id === viewId) ?? views[0];
  const activeBounds = activeView?.bounds ?? null;
  const activeCountries = activeView?.countries ?? null;

  const { landPath, graticulePath, projection } = useMemo(
    () => computeGeo(W, H, activeBounds, activeCountries),
    [activeBounds, activeCountries],
  );

  // Jahresfilter ist jetzt server-seitig (Phase 8.4). Die Karte zeigt genau die
  // übergebenen Einsätze, nur eingeschränkt durch die gewählte Ansicht (Bounds).
  const visible = missions.filter((m) => inBounds(activeBounds, m.lon, m.lat));

  function chooseView(id: string) {
    setViewId(id);
    select(null); // Popup schließen — der Pin liegt evtl. außerhalb der neuen Ansicht.
  }

  return (
    <div>
      {/* Ansicht (Welt/Kontinente/DACH). */}
      {views.length > 1 ? (
        <div className="map-filters">
          <div className="year-filter" role="group" aria-label={labels.view}>
            {views.map((v) => (
              <button
                key={v.id}
                className="chip"
                aria-pressed={activeView?.id === v.id}
                onClick={() => chooseView(v.id)}
              >
                {locale === "de" ? v.labelDe : v.labelEn}
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
                  className={`pin${m.future ? " future" : ""}${selectedId === m.id ? " on" : ""}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${m.eventName}, ${m.city}, ${m.dateLabel}`}
                  aria-pressed={selectedId === m.id}
                  onClick={() => select(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      select(m.id);
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
              const language = talkLanguageLabel(selected.language, locale);
              return (
                <div className="popup" role="dialog" aria-modal="true" aria-label={selected.eventName}>
                  <button className="close" aria-label={locale === "de" ? "Schließen" : "Close"} onClick={() => select(null)}>
                    ×
                  </button>
                  {selected.bannerUrl ? (
                    // Höhe gedeckelt: ein hohes Banner darf den Rest des Popups
                    // nicht aus dem Bild schieben.
                    <AssetImage
                      src={selected.bannerUrl}
                      alt={selected.bannerAlt}
                      ai={selected.bannerAi}
                      className="popup-banner"
                      style={{ display: "block", margin: "0 0 10px" }}
                      imgStyle={{ width: "100%", maxHeight: 132, objectFit: "cover", borderRadius: 4, display: "block" }}
                    />
                  ) : null}

                  <p className="popup-kicker">
                    <span>{selected.dateLabel}</span>
                    <span aria-hidden>·</span>
                    <span>{selected.isOnline ? labels.online : selected.city}</span>
                    {selected.future ? <span className="popup-flag">{labels.planned}</span> : null}
                  </p>
                  <h4>{selected.eventName}</h4>

                  {selected.briefing ? (
                    <div className="popup-row">
                      <span className="popup-label">{labels.briefing}</span>
                      <span className="popup-value">
                        <Link href={`/${locale}/briefings?briefing=${selected.briefing.id}#briefing-${selected.briefing.id}`}>
                          {selected.briefing.title}
                        </Link>
                        {language ? <span className="popup-chip">{language}</span> : null}
                        {selected.durationMin ? (
                          <span className="popup-chip">{selected.durationMin} min</span>
                        ) : null}
                      </span>
                    </div>
                  ) : language || selected.durationMin ? (
                    // Ohne Briefing bleiben Sprache und Dauer trotzdem wissenswert.
                    <div className="popup-row">
                      <span className="popup-label">{labels.language}</span>
                      <span className="popup-value">
                        {language ?? "—"}
                        {selected.durationMin ? <span className="popup-chip">{selected.durationMin} min</span> : null}
                      </span>
                    </div>
                  ) : null}

                  {selected.identities.length > 0 ? (
                    <div className="popup-row">
                      <span className="popup-label">{labels.identity}</span>
                      <span className="popup-value popup-identities">
                        {selected.identities.map((i) => (
                          <Link key={i.slug} className="popup-identity" href={`/${locale}/identitaeten/${i.slug}`}>
                            <span aria-hidden className="popup-dot" style={{ background: i.color }} />
                            {i.name}
                          </Link>
                        ))}
                      </span>
                    </div>
                  ) : null}

                  <div className="popup-actions">
                    {selected.published && selected.caseFilePublic && selected.slug ? (
                      <Link className="btn solid sm" href={`/${locale}/einsaetze/${selected.slug}`}>
                        {labels.openFile}
                      </Link>
                    ) : null}
                    {selected.eventUrl ? (
                      <a className="btn ghost sm" href={selected.eventUrl} target="_blank" rel="noopener noreferrer">
                        {labels.open} ↗
                      </a>
                    ) : null}
                  </div>
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
        </div>
      </div>
    </div>
  );
}
