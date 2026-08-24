"use client";

import { useMemo, useState } from "react";
import ModalDialog from "@/components/admin/ModalDialog";
import { buildSelectionParams } from "@/lib/resume/selection";

// „Lebenslauf erzeugen": Erst aussuchen, dann öffnen. Für eine Bewerbung zählt
// selten alles — mal ohne die frühen Stationen, mal nur die Projekte einer
// Branche. Deshalb steht hier jeder Eintrag einzeln, vorausgewählt ist alles.
//
// Die Auswahl wird nicht gespeichert: Sie hängt als Parameter an der Adresse
// des Lebenslaufs (siehe lib/resume/selection.ts). Jeder Auszug ist damit ein
// Link, den Nicole sich auch aufheben kann.

export interface ExportItem {
  id: string;
  label: string;
  meta?: string;
}

export interface ExportGroup {
  key: string;
  label: string;
  items: ExportItem[];
}

export default function ResumeExportDialog({ groups }: { groups: ExportGroup[] }) {
  const allIds = useMemo(() => groups.flatMap((g) => g.items.map((i) => i.id)), [groups]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(allIds);
  const [locale, setLocale] = useState<"de" | "en">("de");

  const chosen = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function setGroup(group: ExportGroup, on: boolean) {
    const ids = group.items.map((i) => i.id);
    setSelected((prev) => (on ? [...new Set([...prev, ...ids])] : prev.filter((x) => !ids.includes(x))));
  }

  function href(): string {
    const params = new URLSearchParams(buildSelectionParams(allIds, selected));
    const query = params.toString();
    return `/${locale}/cv${query ? `?${query}` : ""}`;
  }

  const total = allIds.length;
  const count = selected.filter((id) => allIds.includes(id)).length;

  return (
    <>
      <button type="button" className="btn solid sm" onClick={() => setOpen(true)}>
        Lebenslauf erzeugen …
      </button>

      {open ? (
        <ModalDialog title="Lebenslauf erzeugen" onClose={() => setOpen(false)} width={860}>
          <p className="meta" style={{ marginTop: 10 }}>
            Wähle aus, was in diesen Lebenslauf gehört. Vorausgewählt ist alles. Das Ergebnis
            öffnet in einem neuen Tab und lässt sich dort drucken oder als PDF sichern.
          </p>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
            <span>
              <label className="f" htmlFor="cv-export-locale" style={{ display: "inline" }}>Sprache</label>{" "}
              <select
                id="cv-export-locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value === "en" ? "en" : "de")}
              >
                <option value="de">Deutsch</option>
                <option value="en">Englisch</option>
              </select>
            </span>
            <button type="button" className="btn ghost sm" onClick={() => setSelected(allIds)}>
              Alles auswählen
            </button>
            <button type="button" className="btn ghost sm" onClick={() => setSelected([])}>
              Nichts auswählen
            </button>
            <span className="meta" style={{ marginLeft: "auto" }} aria-live="polite">
              {count} von {total} Einträgen
            </span>
          </div>

          <div style={{ maxHeight: "48vh", overflowY: "auto", marginTop: 14, paddingRight: 4 }}>
            {groups.map((group) => {
              const ids = group.items.map((i) => i.id);
              const allOn = ids.length > 0 && ids.every((id) => chosen.has(id));
              return (
                <fieldset key={group.key} className="card" style={{ marginTop: 12 }}>
                  <legend style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
                    <span className="eyebrow" style={{ margin: 0 }}>{group.label}</span>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setGroup(group, !allOn)}
                      disabled={ids.length === 0}
                    >
                      {allOn ? "Keinen" : "Alle"}
                    </button>
                  </legend>
                  {group.items.length === 0 ? (
                    <p className="muted" style={{ margin: "6px 0 0" }}>
                      Nichts erfasst — dieser Bereich bleibt im Lebenslauf leer.
                    </p>
                  ) : (
                    group.items.map((item) => (
                      <label
                        key={item.id}
                        style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "4px 0" }}
                      >
                        <input
                          type="checkbox"
                          checked={chosen.has(item.id)}
                          onChange={() => toggle(item.id)}
                          style={{ marginTop: 4 }}
                        />
                        <span>
                          {item.label}
                          {item.meta ? <span className="meta"> — {item.meta}</span> : null}
                        </span>
                      </label>
                    ))
                  )}
                </fieldset>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
            {/* Ein echter Link, kein window.open: So funktioniert „in neuem Tab
                öffnen" auch per Tastatur und Kontextmenü, und die Adresse des
                Auszugs lässt sich kopieren. */}
            <a className="btn solid sm" href={href()} target="_blank" rel="noopener noreferrer">
              Lebenslauf öffnen
            </a>
            <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>
              Abbrechen
            </button>
            {count === 0 ? (
              <span className="meta">Ohne Auswahl bleibt das Dokument bis auf den Kopf leer.</span>
            ) : null}
          </div>
        </ModalDialog>
      ) : null}
    </>
  );
}
