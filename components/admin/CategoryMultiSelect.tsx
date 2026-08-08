"use client";

import { useState } from "react";

export interface CategoryOption {
  id: string;
  name: string;
}

// Moderne Mehrfachauswahl als anklickbare Chips (statt nativem <select multiple>).
// Zwei Betriebsarten:
//  - Formular-Modus: `name` gesetzt → rendert versteckte Inputs, die die Server-
//    Action per formData.getAll(name) liest (ohne JS eingeschränkt bedienbar).
//  - Kontrolliert: `value` + `onChange` → für Client-Formulare mit eigenem State.
export default function CategoryMultiSelect({
  options,
  name,
  defaultSelected = [],
  value,
  onChange,
  emptyHint = "Keine Kategorien vorhanden.",
}: {
  options: CategoryOption[];
  name?: string;
  defaultSelected?: string[];
  value?: string[];
  onChange?: (ids: string[]) => void;
  emptyHint?: string;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState<string[]>(defaultSelected);
  const selected = controlled ? value! : internal;

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    if (!controlled) setInternal(next);
    onChange?.(next);
  }

  if (options.length === 0) {
    return <p className="meta">{emptyHint}</p>;
  }

  return (
    <div>
      <div className="chip-select" role="group" aria-label="Kategorien">
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
      {name ? selected.map((id) => <input key={id} type="hidden" name={name} value={id} />) : null}
    </div>
  );
}
