"use client";

import { useState } from "react";

export interface AttributeRow {
  labelDe: string;
  labelEn: string;
  valueDe: string;
  valueEn: string;
  displayPublic: boolean;
}

// Wiederholbare Merkmalsliste je Identität (Phase 2.2). Der gesamte Satz wird
// als JSON in ein verstecktes Input `name` geschrieben; die Server-Action parst
// ihn. Reihenfolge = Anzeige-Reihenfolge.
export default function IdentityAttributesField({
  name,
  initial,
}: {
  name: string;
  initial: AttributeRow[];
}) {
  const [rows, setRows] = useState<AttributeRow[]>(initial);

  function patch(i: number, part: Partial<AttributeRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...part } : r)));
  }
  function remove(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    setRows((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }
  function add() {
    setRows((prev) => [...prev, { labelDe: "", labelEn: "", valueDe: "", valueEn: "", displayPublic: true }]);
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows.filter((r) => r.labelDe.trim() || r.valueDe.trim()))} readOnly />
      {rows.length === 0 ? <p className="meta">Noch keine Merkmale. „Ausrüstung“, „Typische Zielgruppe“, „Signature Talk“ …</p> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((r, i) => (
          <div key={i} className="card bracket" style={{ padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label className="f">Label DE</label>
                <input className="f" type="text" value={r.labelDe} onChange={(e) => patch(i, { labelDe: e.target.value })} />
              </div>
              <div>
                <label className="f">Label EN</label>
                <input className="f" type="text" value={r.labelEn} onChange={(e) => patch(i, { labelEn: e.target.value })} />
              </div>
              <div>
                <label className="f">Wert DE</label>
                <input className="f" type="text" value={r.valueDe} onChange={(e) => patch(i, { valueDe: e.target.value })} />
              </div>
              <div>
                <label className="f">Wert EN</label>
                <input className="f" type="text" value={r.valueEn} onChange={(e) => patch(i, { valueEn: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={r.displayPublic} onChange={(e) => patch(i, { displayPublic: e.target.checked })} />
                <span className="meta">Öffentlich zeigen</span>
              </label>
              <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button type="button" className="btn ghost sm" onClick={() => move(i, -1)} aria-label="Nach oben">↑</button>
                <button type="button" className="btn ghost sm" onClick={() => move(i, 1)} aria-label="Nach unten">↓</button>
                <button type="button" className="btn ghost sm" onClick={() => remove(i)} aria-label="Entfernen">×</button>
              </span>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn ghost sm" style={{ marginTop: 10 }} onClick={add}>
        + Merkmal hinzufügen
      </button>
    </div>
  );
}
