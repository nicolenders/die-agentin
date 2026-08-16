"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface CoverageMission {
  slug: string | null;
  eventName: string;
  city: string;
  dateLabel: string;
  /** Nur mit freigegebener Einsatzakte wird der Name verlinkt. */
  linkable: boolean;
  /** Dort gehaltenes Briefing — führt in den Briefing-Katalog. */
  briefing: { id: string; title: string } | null;
}
export interface CoverageBriefing {
  title: string;
}
export interface CoverageDispatch {
  slug: string;
  title: string;
  format: string;
}

// Verknüpfte Einsätze und Briefings (und ggf. Depeschen) einer Identität als
// Tabs mit Suche und Tabelle. Einsätze sind standardmäßig aktiv.
export default function IdentityCoverageTabs({
  locale,
  missions,
  briefings,
  dispatches,
  labels,
}: {
  locale: string;
  missions: CoverageMission[];
  briefings: CoverageBriefing[];
  dispatches: CoverageDispatch[];
  labels: {
    einsaetze: string;
    briefings: string;
    depeschen: string;
    search: string;
    date: string;
    event: string;
    briefing: string;
    location: string;
    title: string;
    format: string;
    empty: string;
  };
}) {
  const tabs = [
    { key: "einsaetze", label: labels.einsaetze, count: missions.length },
    { key: "briefings", label: labels.briefings, count: briefings.length },
    ...(dispatches.length > 0 ? [{ key: "depeschen", label: labels.depeschen, count: dispatches.length }] : []),
  ];
  const [tab, setTab] = useState("einsaetze");
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();

  const fMissions = useMemo(
    () =>
      missions.filter(
        (m) => !needle || `${m.eventName} ${m.city} ${m.briefing?.title ?? ""}`.toLowerCase().includes(needle),
      ),
    [missions, needle],
  );
  const fBriefings = useMemo(
    () => briefings.filter((b) => !needle || b.title.toLowerCase().includes(needle)),
    [briefings, needle],
  );
  const fDispatches = useMemo(
    () => dispatches.filter((d) => !needle || d.title.toLowerCase().includes(needle)),
    [dispatches, needle],
  );

  return (
    <div>
      <div className="tab-bar" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      <input
        className="f"
        type="search"
        placeholder={labels.search}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label={labels.search}
        style={{ maxWidth: 320, marginTop: 14 }}
      />

      <div style={{ marginTop: 12 }}>
        {tab === "einsaetze" ? (
          fMissions.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>{labels.date}</th>
                  <th>{labels.event}</th>
                  <th>{labels.briefing}</th>
                  <th>{labels.location}</th>
                </tr>
              </thead>
              <tbody>
                {fMissions.map((m, idx) => (
                  <tr key={`${m.eventName}-${idx}`}>
                    <td className="meta">{m.dateLabel}</td>
                    <td>
                      {m.linkable && m.slug ? (
                        <Link href={`/${locale}/einsaetze/${m.slug}`}>{m.eventName}</Link>
                      ) : (
                        m.eventName
                      )}
                    </td>
                    <td>
                      {m.briefing ? (
                        <Link href={`/${locale}/briefings?briefing=${m.briefing.id}#briefing-${m.briefing.id}`}>
                          {m.briefing.title}
                        </Link>
                      ) : (
                        <span className="meta">—</span>
                      )}
                    </td>
                    <td className="meta">{m.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">{labels.empty}</p>
          )
        ) : tab === "briefings" ? (
          fBriefings.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>{labels.title}</th>
                </tr>
              </thead>
              <tbody>
                {fBriefings.map((b, idx) => (
                  <tr key={`${b.title}-${idx}`}>
                    <td>{b.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">{labels.empty}</p>
          )
        ) : fDispatches.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>{labels.title}</th>
                <th>{labels.format}</th>
              </tr>
            </thead>
            <tbody>
              {fDispatches.map((d) => (
                <tr key={d.slug}>
                  <td><Link href={`/${locale}/depeschen/${d.slug}`}>{d.title}</Link></td>
                  <td className="meta">{d.format}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">{labels.empty}</p>
        )}
      </div>
    </div>
  );
}
