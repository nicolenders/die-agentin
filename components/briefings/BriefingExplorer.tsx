"use client";

import { useMemo, useState, type ReactNode } from "react";

export interface ExplorerItem {
  id: string;
  title: string;
  searchText: string; // Titel + Inhalt (Plain) für die Suche
  categories: string[];
  audiences: string[];
  identitySlugs: string[];
  level: string | null;
  durationMin: number | null;
  deCount: number;
  enCount: number;
  total: number;
  abstractNode: ReactNode; // serverseitig gerenderter Rich-Text
}

export interface ExplorerIdentity {
  slug: string;
  name: string;
  color: string;
}

// Filterbare Briefing-Liste: Freitextsuche + anklickbare Mehrfach-Kategorie-
// filter (OR: ein Treffer je ausgewählter Kategorie genügt). Passende Kategorien
// werden am Eintrag hervorgehoben. Jedes Briefing erscheint genau einmal.
export default function BriefingExplorer({
  items,
  categories,
  identities = [],
  locale,
}: {
  items: ExplorerItem[];
  categories: string[];
  identities?: ExplorerIdentity[];
  locale: string;
}) {
  const isDe = locale === "de";
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = (cat: string) =>
    setSelected((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  const toggleId = (slug: string) =>
    setSelectedIds((prev) => (prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]));

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
        <div className="year-filter" role="group" aria-label={isDe ? "Nach Identität filtern" : "Filter by identity"} style={{ marginBottom: 8 }}>
          <button className="chip" aria-pressed={selectedIds.length === 0} onClick={() => setSelectedIds([])}>
            {isDe ? "Alle Identitäten" : "All identities"}
          </button>
          {identities.map((i) => (
            <button
              key={i.slug}
              className="chip"
              aria-pressed={selectedIds.includes(i.slug)}
              onClick={() => toggleId(i.slug)}
              style={selectedIds.includes(i.slug) ? { borderColor: i.color } : undefined}
            >
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
        <div className="grid g2">
          {filtered.map((it) => (
            <article key={it.id} className="card bracket">
              <h3>{it.title}</h3>

              {it.categories.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
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
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
