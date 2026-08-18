"use client";

import { useState } from "react";
import { createTool } from "@/app/(admin)/admin/(protected)/identitaeten/actions";

interface ToolOption {
  id: string;
  name: string;
}

// Werkzeuge einer Identität: bestehende als Chips auswählen und neue direkt
// anlegen (ohne die Maske zu verlassen). Die Auswahl wird als versteckte
// `toolIds`-Inputs übermittelt; die Server-Action liest sie per getAll.
export default function IdentityToolsField({
  initialOptions,
  defaultSelected,
}: {
  initialOptions: ToolOption[];
  defaultSelected: string[];
}) {
  const [options, setOptions] = useState<ToolOption[]>(initialOptions);
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    // Bereits vorhandenes Werkzeug (gleicher Name) nur auswählen, nicht anlegen.
    const existing = options.find((o) => o.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selected.includes(existing.id)) toggle(existing.id);
      setNewName("");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await createTool({ name });
    setBusy(false);
    if (!res.ok || !res.id) {
      setError(res.error ?? "Anlegen fehlgeschlagen.");
      return;
    }
    const id = res.id;
    setOptions((o) => (o.some((t) => t.id === id) ? o : [...o, { id, name: res.name ?? name }]));
    setSelected((s) => (s.includes(id) ? s : [...s, id]));
    setNewName("");
  }

  return (
    <div>
      <p className="meta">
        Werkzeuge dieser Identität. Neue Werkzeuge hier anlegen. Die öffentliche Legende zeigt die
        Vereinigung aller Identitäts-Werkzeuge (Duplikate entfernt, alphabetisch).
      </p>

      {options.length > 0 ? (
        <div className="chip-select" role="group" aria-label="Werkzeuge">
          {options.map((o) => {
            const on = selected.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                className={`chip-toggle${on ? " on" : ""}`}
                aria-pressed={on}
                onClick={() => toggle(o.id)}
              >
                {o.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="meta">Noch keine Werkzeuge angelegt. Unten das erste hinzufügen.</p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          className="f"
          style={{ margin: 0 }}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Neues Werkzeug, z. B. Copilot Studio"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
          aria-label="Neues Werkzeug"
        />
        <button type="button" className="btn ghost sm" disabled={busy} onClick={() => void add()}>
          {busy ? "Legt an …" : "Hinzufügen"}
        </button>
      </div>
      {error ? <p className="meta" style={{ marginTop: 8, color: "var(--danger)" }}>{error}</p> : null}

      {selected.map((id) => (
        <input key={id} type="hidden" name="toolIds" value={id} />
      ))}
    </div>
  );
}
