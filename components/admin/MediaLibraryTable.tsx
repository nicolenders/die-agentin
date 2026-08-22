"use client";

import { useMemo, useState, type ReactNode } from "react";
import { MEDIA_SOURCES, SOURCE_LABEL, type MediaSource } from "@/lib/media/source";

export interface MediaRow {
  id: string;
  source: MediaSource;
  createdAtLabel: string;
  size: string;
  usages: { type: string; label: string }[];
  thumb: ReactNode;
  editForm: ReactNode;
  deleteForm: ReactNode;
  defaults: { altDe: string; altEn: string; decorative: boolean };
}

// Tabellarische Medienbibliothek mit Thumbnails und Filtern über die Metadaten-
// Spalten (Suche, Herkunft, Verwendung). Die Bearbeiten-Felder gehören per
// `form`-Attribut zum jeweiligen (unsichtbaren) Formular in der Aktionsspalte.
export default function MediaLibraryTable({ rows }: { rows: MediaRow[] }) {
  const [q, setQ] = useState("");
  const [source, setSource] = useState<"" | MediaSource>("");
  const [usage, setUsage] = useState<"" | "used" | "unused">("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (source && r.source !== source) return false;
      if (usage === "used" && r.usages.length === 0) return false;
      if (usage === "unused" && r.usages.length > 0) return false;
      if (needle) {
        const hay = `${r.defaults.altDe} ${r.defaults.altEn} ${r.usages
          .map((u) => `${u.type} ${u.label}`)
          .join(" ")}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, source, usage]);

  return (
    <div>
      <div className="year-filter" style={{ alignItems: "center", gap: 10 }}>
        <input
          className="f"
          style={{ maxWidth: 240 }}
          placeholder="Suche (Alt-Text, Verwendung) …"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Medien durchsuchen"
        />
        <select className="f" style={{ maxWidth: 200 }} value={source} onChange={(e) => setSource(e.target.value as "" | MediaSource)} aria-label="Nach Herkunft filtern">
          <option value="">Alle Herkünfte</option>
          {MEDIA_SOURCES.map((s) => (
            <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
          ))}
        </select>
        <select className="f" style={{ maxWidth: 170 }} value={usage} onChange={(e) => setUsage(e.target.value as "" | "used" | "unused")} aria-label="Nach Verwendung filtern">
          <option value="">Alle</option>
          <option value="used">Verwendet</option>
          <option value="unused">Ungenutzt</option>
        </select>
        <span className="meta">{filtered.length} von {rows.length}</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="media-table">
          <thead>
            <tr>
              {/* Feste Breiten für Bild und Herkunft: Das Vorschaubild braucht
                  Platz für Querformate, und „KI-generiert" darf im Auswahlfeld
                  nicht dreizeilig umbrechen. */}
              <th style={{ width: 176 }}>Bild</th>
              <th>Alt-Text</th>
              <th style={{ width: 170 }}>Herkunft</th>
              <th>Größe</th>
              <th>Hochgeladen</th>
              <th>Verwendet in</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td style={{ width: 176 }}>{r.thumb}</td>
                <td style={{ minWidth: 220 }}>
                  <input className="f" form={`asset-${r.id}`} name="altDe" defaultValue={r.defaults.altDe} placeholder="Alt-Text (DE)" aria-label="Alt-Text DE" />
                  <input className="f" form={`asset-${r.id}`} name="altEn" defaultValue={r.defaults.altEn} placeholder="Alt-Text (EN)" aria-label="Alt-Text EN" style={{ marginTop: 4 }} />
                  <label style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, fontSize: 12 }}>
                    <input type="checkbox" form={`asset-${r.id}`} name="decorative" value="true" defaultChecked={r.defaults.decorative} /> Dekorativ
                  </label>
                </td>
                <td style={{ width: 170 }}>
                  <select className="f" form={`asset-${r.id}`} name="source" defaultValue={r.source} aria-label="Herkunft" style={{ minWidth: 150 }}>
                    {MEDIA_SOURCES.map((s) => (
                      <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
                    ))}
                  </select>
                </td>
                <td className="meta" style={{ whiteSpace: "nowrap" }}>{r.size}</td>
                <td className="meta" style={{ whiteSpace: "nowrap" }}>{r.createdAtLabel}</td>
                <td style={{ minWidth: 180 }}>
                  {r.usages.length === 0 ? (
                    <span className="meta">ungenutzt</span>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {r.usages.map((u, i) => (
                        <span key={i} className="tag" style={{ fontSize: 11 }}>
                          {u.type}: {u.label}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {r.editForm}
                  <button className="btn ghost sm" type="submit" form={`asset-${r.id}`}>Speichern</button>{" "}
                  {r.deleteForm}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
