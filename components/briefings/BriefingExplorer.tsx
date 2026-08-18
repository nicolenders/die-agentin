"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

/** Ein Einsatz, bei dem das Briefing gehalten wurde (bereits aufbereitet). */
export interface ExplorerMissionRow {
  id: string;
  href: string | null; // null = keine öffentliche Einsatzakte
  eventName: string;
  location: string;
  dateLabel: string;
  languageLabel: string;
}

export interface ExplorerItem {
  id: string;
  title: string;
  searchText: string; // Titel + Inhalt (Plain) für die Suche
  categories: string[];
  audiences: string[];
  identitySlugs: string[];
  level: string | null;
  durationMin: number | null;
  /** Serverseitig formatierte Dauer („45 Min.", „7 Std.") — null ohne Angabe. */
  durationLabel: string | null;
  /** Ab 180 Minuten: Workshop statt Session (Audit 4.7). */
  isWorkshop: boolean;
  deCount: number;
  enCount: number;
  total: number;
  missions: ExplorerMissionRow[];
  abstractNode: ReactNode; // serverseitig gerenderter Rich-Text
}

export interface ExplorerLabels {
  newInRepertoire: string;
  workshop: string;
}

export interface ExplorerIdentity {
  slug: string;
  name: string;
  color: string;
  portraitUrl: string | null;
}

// Filterbare Briefing-Liste: Freitextsuche + anklickbare Mehrfach-Kategorie-
// filter (OR: ein Treffer je ausgewählter Kategorie genügt). Passende Kategorien
// werden am Eintrag hervorgehoben. Jedes Briefing erscheint genau einmal.
export default function BriefingExplorer({
  items,
  categories,
  identities = [],
  locale,
  labels,
}: {
  items: ExplorerItem[];
  categories: string[];
  identities?: ExplorerIdentity[];
  locale: string;
  labels: ExplorerLabels;
}) {
  const isDe = locale === "de";
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (cat: string) =>
    setSelected((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  const toggleId = (slug: string) =>
    setSelectedIds((prev) => (prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]));
  const toggleOpen = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Direktlink aus der Einsatzliste („?briefing=<id>"): passendes Briefing
  // aufklappen. Der Anker im Link erledigt das Scrollen.
  /* eslint-disable react-hooks/set-state-in-effect -- Einmaliges Öffnen des per
     Deep-Link adressierten Briefings. Server und erste Client-Ausgabe rendern
     alles zugeklappt; erst danach wird die URL gelesen (keine Hydrationsabweichung). */
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("briefing");
    if (wanted) setOpenIds((prev) => new Set(prev).add(wanted));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const max = useMemo(() => items.reduce((m, i) => Math.max(m, i.total), 1), [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (needle && !it.searchText.toLowerCase().includes(needle)) return false;
      if (selected.length > 0 && !it.categories.some((c) => selected.includes(c))) return false;
      if (selectedIds.length > 0 && !it.identitySlugs.some((s) => selectedIds.includes(s))) return false;
      return true;
    });
  }, [items, q, selected, selectedIds]);

  return (
    <div>
      <input
        className="f"
        style={{ maxWidth: 380, marginBottom: 14 }}
        type="search"
        placeholder={isDe ? "Briefings durchsuchen …" : "Search briefings …"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label={isDe ? "Briefings durchsuchen" : "Search briefings"}
      />

      {categories.length > 0 ? (
        <div className="year-filter" role="group" aria-label={isDe ? "Nach Kategorie filtern" : "Filter by category"} style={{ marginBottom: 8 }}>
          <button className="chip" aria-pressed={selected.length === 0} onClick={() => setSelected([])}>
            {isDe ? "Alle" : "All"}
          </button>
          {categories.map((cat) => (
            <button key={cat} className="chip" aria-pressed={selected.includes(cat)} onClick={() => toggle(cat)}>
              {cat}
            </button>
          ))}
        </div>
      ) : null}

      {identities.length > 0 ? (
        <div className="filter-row" role="group" aria-label={isDe ? "Nach Identität filtern" : "Filter by identity"} style={{ marginBottom: 8 }}>
          <button type="button" className="id-chip text-only" aria-pressed={selectedIds.length === 0} onClick={() => setSelectedIds([])}>
            {isDe ? "Alle" : "All"}
          </button>
          {identities.map((i) => (
            <button
              key={i.slug}
              type="button"
              className="id-chip"
              aria-pressed={selectedIds.includes(i.slug)}
              onClick={() => toggleId(i.slug)}
              title={i.name}
            >
              {i.portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="id-ava" src={i.portraitUrl} alt="" loading="lazy" />
              ) : (
                <span className="id-dot" aria-hidden style={{ background: i.color }} />
              )}
              {i.name}
            </button>
          ))}
        </div>
      ) : null}

      <p className="meta" style={{ marginBottom: 16 }}>
        {filtered.length} {isDe ? "von" : "of"} {items.length} {isDe ? "Briefings" : "briefings"}
        {selected.length > 0 ? ` · ${isDe ? "Filter" : "filter"}: ${selected.join(", ")}` : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="muted">{isDe ? "Keine Briefings passen zu Suche/Filter." : "No briefings match the search/filter."}</p>
      ) : (
        <div className="acc">
          {filtered.map((it) => {
            const open = openIds.has(it.id);
            return (
              <div key={it.id} id={`briefing-${it.id}`} className={`acc-item${open ? " open" : ""}`}>
                <button
                  type="button"
                  className="acc-head"
                  aria-expanded={open}
                  onClick={() => toggleOpen(it.id)}
                >
                  <span className="acc-chevron" aria-hidden>{open ? "−" : "+"}</span>
                  <span className="acc-title">{it.title}</span>
                  {/* Alle zugeordneten Kategorien zeigen (Audit 4.5, Schritt 1):
                      vorher waren es nur die ersten zwei, sodass die Kategorie,
                      nach der gerade gefiltert wurde, unsichtbar bleiben konnte. */}
                  <span className="acc-tags">
                    {it.categories.map((cat) => (
                      <span key={cat} className={`tag${selected.includes(cat) ? " on" : ""}`}>{cat}</span>
                    ))}
                    {it.isWorkshop ? <span className="tag">{labels.workshop}</span> : null}
                  </span>
                  <span className="acc-count meta">
                    {it.total > 0 ? `${it.total}×` : labels.newInRepertoire}
                    {it.durationLabel ? ` · ${it.durationLabel}` : ""}
                  </span>
                </button>
                {open ? (
                  <div className="acc-body">
                    {it.categories.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {it.categories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className={`cat-tag${selected.includes(cat) ? " on" : ""}`}
                            onClick={() => toggle(cat)}
                            title={isDe ? "Nach dieser Kategorie filtern" : "Filter by this category"}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div style={{ fontSize: "14.5px" }}>{it.abstractNode}</div>
                    {it.audiences.length > 0 ? (
                      <p className="meta">{isDe ? "Für: " : "For: "}{it.audiences.join(" · ")}</p>
                    ) : null}
                    <p className="meta">
                      {it.total}× {isDe ? "gehalten" : "delivered"}
                      {it.level ? ` · Level ${it.level}` : ""}
                      {it.durationMin ? ` · ${it.durationMin} Min.` : ""}
                    </p>
                    <div className="bar" aria-hidden="true">
                      <i style={{ width: `${Math.round((it.total / max) * 100)}%` }} />
                    </div>
                    <p style={{ marginTop: 8 }}>
                      <span className={`lang-badge ${it.deCount > 0 ? "on" : ""}`}>DE {it.deCount > 0 ? `✓ ${it.deCount}×` : "—"}</span>{" "}
                      <span className={`lang-badge ${it.enCount > 0 ? "on" : ""}`}>EN {it.enCount > 0 ? `✓ ${it.enCount}×` : "—"}</span>
                    </p>

                    {it.missions.length > 0 ? (
                      <>
                        <p className="eyebrow" style={{ marginTop: 18 }}>
                          {isDe ? "Gehalten bei" : "Delivered at"}
                        </p>
                        {/* Am Telefon genügen Datum, Veranstaltung und Ort — die
                            Sprache steht als DE/EN-Marke schon über der Tabelle. */}
                        <table className="stack" role="table" style={{ marginTop: 8 }}>
                          <thead role="rowgroup">
                            <tr role="row">
                              <th scope="col" role="columnheader">{isDe ? "Datum" : "Date"}</th>
                              <th scope="col" role="columnheader">{isDe ? "Veranstaltung" : "Event"}</th>
                              <th scope="col" role="columnheader">{isDe ? "Ort" : "Location"}</th>
                              <th scope="col" role="columnheader" className="hide-sm">{isDe ? "Sprache" : "Language"}</th>
                            </tr>
                          </thead>
                          <tbody role="rowgroup">
                            {it.missions.map((m) => (
                              <tr role="row" key={m.id}>
                                <td role="cell" className="meta" data-label={isDe ? "Datum" : "Date"}>{m.dateLabel}</td>
                                <td role="cell" data-label={isDe ? "Veranstaltung" : "Event"} data-primary="">
                                  {m.href ? <Link href={m.href}>{m.eventName}</Link> : m.eventName}
                                </td>
                                <td role="cell" data-label={isDe ? "Ort" : "Location"}>{m.location}</td>
                                <td role="cell" className="meta hide-sm" data-label={isDe ? "Sprache" : "Language"}>
                                  {m.languageLabel}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
