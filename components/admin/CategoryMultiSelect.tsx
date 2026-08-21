"use client";

import { useId, useRef, useState, useTransition } from "react";
import { findByName, type InlineCreateResult } from "@/lib/admin/inline-create";

export interface CategoryOption {
  id: string;
  name: string;
}

// Moderne Mehrfachauswahl als anklickbare Chips (statt nativem <select multiple>).
// Zwei Betriebsarten:
//  - Formular-Modus: `name` gesetzt → rendert versteckte Inputs, die die Server-
//    Action per formData.getAll(name) liest (ohne JS eingeschränkt bedienbar).
//  - Kontrolliert: `value` + `onChange` → für Client-Formulare mit eigenem State.
//
// Optional lässt sich ein fehlender Eintrag an Ort und Stelle anlegen (`create`).
// Dann erscheint unter den Chips ein Feld; der neue Eintrag wird sofort
// ausgewählt, ohne dass das umgebende Formular abgeschickt oder verlassen wird.
export default function CategoryMultiSelect({
  options,
  name,
  defaultSelected = [],
  value,
  onChange,
  emptyHint = "Keine Kategorien vorhanden.",
  groupLabel = "Auswahl",
  create,
  createLabel,
  relatedField,
}: {
  options: CategoryOption[];
  name?: string;
  defaultSelected?: string[];
  value?: string[];
  onChange?: (ids: string[]) => void;
  emptyHint?: string;
  /** Name der Gruppe für Screenreader — die sichtbare Beschriftung darüber. */
  groupLabel?: string;
  /** Server-Action, die den Eintrag anlegt und zurückgibt. */
  create?: (rawName: string, related: string[]) => Promise<InlineCreateResult>;
  /** Beschriftung des Anlege-Felds, z. B. „Neues Fachgebiet". */
  createLabel?: string;
  /**
   * Feldname im umgebenden Formular, dessen aktuelle Auswahl an `create`
   * weitergereicht wird — so erbt ein hier angelegtes Radar-Thema die
   * Identitäten der Depesche, aus der heraus es entsteht.
   */
  relatedField?: string;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState<string[]>(defaultSelected);
  const selected = controlled ? value! : internal;

  // Hier angelegte Einträge kommen zu den vom Server gelieferten dazu, bis die
  // Seite das nächste Mal geladen wird.
  const [added, setAdded] = useState<CategoryOption[]>([]);
  const all = [...options, ...added];

  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const field = useRef<HTMLInputElement>(null);
  const inputId = useId();

  function select(id: string) {
    if (selected.includes(id)) return;
    const next = [...selected, id];
    if (!controlled) setInternal(next);
    onChange?.(next);
  }

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    if (!controlled) setInternal(next);
    onChange?.(next);
  }

  function related(): string[] {
    if (!relatedField) return [];
    const form = field.current?.closest("form");
    if (!form) return [];
    return new FormData(form).getAll(relatedField).map((v) => String(v)).filter(Boolean);
  }

  function submitDraft() {
    if (!create || pending) return;
    const raw = draft;
    // Was es schon gibt, wird ausgewählt statt ein zweites Mal angelegt — das
    // entscheidet die Oberfläche schon hier, damit dafür kein Serverweg nötig ist.
    const known = findByName(all, raw);
    if (known) {
      select(known.id);
      setDraft("");
      setFailed(false);
      setNote(`„${known.name}“ gab es schon und ist jetzt ausgewählt.`);
      return;
    }
    startTransition(async () => {
      const result = await create(raw, related());
      if (!result.ok) {
        setFailed(true);
        setNote(result.error);
        return;
      }
      setAdded((prev) =>
        prev.some((o) => o.id === result.option.id) ? prev : [...prev, result.option],
      );
      select(result.option.id);
      setDraft("");
      setFailed(false);
      setNote(
        result.existed
          ? `„${result.option.name}“ gab es schon und ist jetzt ausgewählt.`
          : `„${result.option.name}“ angelegt und ausgewählt.`,
      );
    });
  }

  return (
    <div>
      {all.length === 0 ? (
        <p className="meta">{emptyHint}</p>
      ) : (
        <div className="chip-select" role="group" aria-label={groupLabel}>
          {all.map((o) => {
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
      )}

      {create ? (
        <div className="chip-create">
          <label className="f" htmlFor={inputId}>
            {createLabel ?? "Neuer Eintrag"}
          </label>
          <div className="chip-create-row">
            <input
              ref={field}
              id={inputId}
              className="f"
              type="text"
              value={draft}
              disabled={pending}
              placeholder="Name eingeben"
              onChange={(event) => {
                setDraft(event.target.value);
                if (note) setNote(null);
              }}
              onKeyDown={(event) => {
                // Ohne das schickt die Eingabetaste das ganze Formular ab und
                // speichert eine halb ausgefüllte Depesche.
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitDraft();
                }
              }}
            />
            <button
              className="btn ghost sm"
              type="button"
              onClick={submitDraft}
              disabled={pending || draft.trim() === ""}
            >
              {pending ? "Legt an …" : "+ Anlegen"}
            </button>
          </div>
          <p
            className="meta"
            role="status"
            aria-live="polite"
            style={failed ? { color: "var(--magenta)" } : undefined}
          >
            {note ?? ""}
          </p>
        </div>
      ) : null}

      {name ? selected.map((id) => <input key={id} type="hidden" name={name} value={id} />) : null}
    </div>
  );
}
