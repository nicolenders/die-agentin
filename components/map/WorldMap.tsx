"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { computeGeo, project } from "@/lib/map/geo";
import { availableViews, inBounds } from "@/lib/map/views";
import AssetImage from "@/components/media/AssetImage";
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
  briefing: { id: string; title: string; language: string } | null;
}

const LANGUAGE_LABEL: Record<string, { de: string; en: string }> = {
  de: { de: "Deutsch", en: "German" },
  en: { de: "Englisch", en: "English" },
};

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
  };
}) {
  const [viewId, setViewId] = useState("welt");
  const [selected, setSelected] = useState<MapMission | null>(null);

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
    setSelected(null); // Popup schließen — der Pin liegt evtl. außerhalb der neuen Ansicht.
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
              const language = selected.briefing
                ? LANGUAGE_LABEL[selected.briefing.language]?.[locale] ?? selected.briefing.language.toUpperCase()
                : null;
              return (
                <div
                  className="popup"
                  style={{
                    left: `min(max(${(x / W) * 100}% - 150px, 8px), calc(100% - 308px))`,
                    top: `max(${(y / H) * 100}% - 150px, 8px)`,
                  }}
                >
                  <button className="close" aria-label={locale === "de" ? "Schließen" : "Close"} onClick={() => setSelected(null)}>
                    ×
                  </button>
                  {selected.bannerUrl ? (
                    <AssetImage
                      src={selected.bannerUrl}
                      alt={selected.bannerAlt}
                      ai={selected.bannerAi}
                      style={{ display: "block", margin: "0 0 10px" }}
                      imgStyle={{ width: "100%", borderRadius: 4, display: "block" }}
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
