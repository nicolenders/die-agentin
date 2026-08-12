"use client";

import { useState } from "react";

// Bearbeitbare Liste von Freitext-Stichpunkten (z. B. Identitäts-`focus`,
// Sprachen). Der Wert wird als JSON-Array in ein verstecktes Input mit dem
// gegebenen `name` geschrieben; die Server-Action parst es (parseStringList).
export default function StringListField({
  name,
  initial,
  placeholder = "Eintrag …",
  addLabel = "Hinzufügen",
}: {
  name: string;
  initial: string[];
  placeholder?: string;
  addLabel?: string;
}) {
  const [items, setItems] = useState<string[]>(initial.length ? initial : [""]);

  function update(i: number, value: string) {
    setItems((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }
  function remove(i: number) {
    setItems((prev) => (prev.length <= 1 ? [""] : prev.filter((_, idx) => idx !== i)));
  }

  const serialized = JSON.stringify(items.map((s) => s.trim()).filter(Boolean));

  return (
    <div>
      <input type="hidden" name={name} value={serialized} readOnly />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((value, i) => (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={value}
              placeholder={placeholder}
              onChange={(e) => update(i, e.target.value)}
              style={{ flex: 1 }}
              aria-label={`${placeholder} ${i + 1}`}
            />
            <button type="button" className="btn ghost sm" onClick={() => remove(i)} aria-label="Entfernen">
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => setItems((p) => [...p, ""])}>
        + {addLabel}
      </button>
    </div>
  );
}
