"use client";

import { useState } from "react";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ModalDialog from "@/components/admin/ModalDialog";
import { SKILL_LEVELS, SKILL_LEVEL_LABEL } from "@/lib/domain";
import { computeSkillYears, effectiveSkillYears } from "@/lib/resume/skills";
import { displayClient, formatPeriod, formatPersonDays } from "@/lib/resume/projects";
import type { ResumeSection } from "@/lib/resume/sections";

// Eine Rubrik des Lebenslaufs: erst die Tabelle mit dem, was da ist, dann der
// Dialog zum Anlegen und Ändern. Die Reihenfolge stellt Nicole direkt in der
// Tabelle mit den Pfeilen ein — der Weg über ein Zahlenfeld im Formular
// bedeutete, sich Zahlen zu merken, die niemand sieht.

export interface ResumeEntryRow {
  id: string;
  section: ResumeSection;
  title: string;
  subtitle: string | null;
  location: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  description: string | null;
  /** Tags als Komma-Text, wie sie im Formular stehen. */
  tagsText: string;
  projectFrom: string | null;
  projectTo: string | null;
  personDays: number | null;
  clientAnonymous: boolean;
  clientSector: string | null;
  skillYears: number | null;
  skillLevel: string | null;
}

type FormAction = (formData: FormData) => void | Promise<void>;

function shorten(value: string | null, max = 90): string {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** Felder eines Eintrags — dieselben beim Anlegen und beim Bearbeiten. */
function EntryFields({ row, section, idPrefix }: { row?: ResumeEntryRow; section: ResumeSection; idPrefix: string }) {
  // Bei Fähigkeiten zeigt das Formular die berechneten Jahre an, sobald sich
  // der Zeitraum lesen lässt — sonst bleibt das Feld eine freie Eingabe.
  const derivedYears = section === "SKILL" ? computeSkillYears(row?.periodFrom, row?.periodTo) : null;
  const yearsHintId = `${idPrefix}-years-hint`;
  return (
    <>
      <input type="hidden" name="section" value={section} />
      {row ? <input type="hidden" name="id" value={row.id} /> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <span style={{ flex: "2 1 220px" }}>
          <label className="f" htmlFor={`${idPrefix}-title`}>
            Titel {section === "SKILL" ? "(Kategorie)" : ""}
          </label>
          <input className="f" id={`${idPrefix}-title`} name="title" defaultValue={row?.title ?? ""} required />
        </span>
        <span style={{ flex: "2 1 220px" }}>
          <label className="f" htmlFor={`${idPrefix}-subtitle`}>
            {section === "PROJECT" ? "Kunde" : section === "CAREER" ? "Arbeitgeber" : "Untertitel"}
          </label>
          <input className="f" id={`${idPrefix}-subtitle`} name="subtitle" defaultValue={row?.subtitle ?? ""} />
        </span>
        <span style={{ flex: "0 1 120px" }}>
          <label className="f" htmlFor={`${idPrefix}-from`}>{section === "PROJECT" ? "Einsatz von" : "Von"}</label>
          <input className="f" id={`${idPrefix}-from`} name="periodFrom" defaultValue={row?.periodFrom ?? ""} placeholder="03/2018" />
        </span>
        <span style={{ flex: "0 1 120px" }}>
          <label className="f" htmlFor={`${idPrefix}-to`}>{section === "PROJECT" ? "Einsatz bis" : "Bis"}</label>
          <input className="f" id={`${idPrefix}-to`} name="periodTo" defaultValue={row?.periodTo ?? ""} placeholder="heute" />
        </span>
      </div>

      {section === "PROJECT" ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <span style={{ flex: "0 1 130px" }}>
              <label className="f" htmlFor={`${idPrefix}-pfrom`}>Projekt von</label>
              <input className="f" id={`${idPrefix}-pfrom`} name="projectFrom" defaultValue={row?.projectFrom ?? ""} placeholder="01/2018" />
            </span>
            <span style={{ flex: "0 1 130px" }}>
              <label className="f" htmlFor={`${idPrefix}-pto`}>Projekt bis</label>
              <input className="f" id={`${idPrefix}-pto`} name="projectTo" defaultValue={row?.projectTo ?? ""} placeholder="12/2020" />
            </span>
            <span style={{ flex: "0 1 170px" }}>
              <label className="f" htmlFor={`${idPrefix}-pt`}>Aufwand (PT, ungefähr)</label>
              <input className="f" id={`${idPrefix}-pt`} name="personDays" type="number" min={0} defaultValue={row?.personDays ?? ""} placeholder="120" />
            </span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <input type="checkbox" name="clientAnonymous" defaultChecked={row?.clientAnonymous ?? false} />
            Kunde anonym — der Name erscheint nirgends im Lebenslauf
          </label>
          <label className="f" htmlFor={`${idPrefix}-sector`}>Branche statt Kundenname (bei anonym)</label>
          <input className="f" id={`${idPrefix}-sector`} name="clientSector" defaultValue={row?.clientSector ?? ""} placeholder="z. B. Energieversorger" />
        </>
      ) : null}

      {section === "SKILL" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <span style={{ flex: "0 1 150px" }}>
            <label className="f" htmlFor={`${idPrefix}-years`}>Jahre Erfahrung</label>
            <input
              className="f"
              id={`${idPrefix}-years`}
              name="skillYears"
              type="number"
              min={0}
              defaultValue={derivedYears ?? row?.skillYears ?? ""}
              readOnly={derivedYears != null}
              aria-describedby={yearsHintId}
            />
          </span>
          <span style={{ flex: "1 1 200px" }}>
            <label className="f" htmlFor={`${idPrefix}-level`}>Können</label>
            <select className="f" id={`${idPrefix}-level`} name="skillLevel" defaultValue={row?.skillLevel ?? ""}>
              <option value="">— keine Angabe —</option>
              {SKILL_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {SKILL_LEVEL_LABEL[level].de}
                </option>
              ))}
            </select>
          </span>
          <p className="meta" id={yearsHintId} style={{ flexBasis: "100%", margin: "4px 0 0" }}>
            {derivedYears != null
              ? `Aus „von“/„bis“ berechnet: ${derivedYears} ${derivedYears === 1 ? "Jahr" : "Jahre"}. Zum Ändern den Zeitraum anpassen.`
              : "Ohne lesbaren Zeitraum gilt diese Eingabe. Lesbar sind z. B. 03/2018, 2018-03, 2018 und „heute“."}
          </p>
        </div>
      ) : null}

      {section !== "SKILL" ? (
        <>
          <label className="f" htmlFor={`${idPrefix}-location`}>Ort (optional)</label>
          <input className="f" id={`${idPrefix}-location`} name="location" defaultValue={row?.location ?? ""} />
        </>
      ) : (
        <input type="hidden" name="location" value="" />
      )}

      <label className="f" htmlFor={`${idPrefix}-description`}>
        Beschreibung {section === "SKILL" ? "(Fähigkeiten, Komma-getrennt)" : ""}
      </label>
      <textarea
        className="f"
        id={`${idPrefix}-description`}
        name="description"
        rows={section === "SKILL" ? 3 : 4}
        defaultValue={row?.description ?? ""}
      />

      <label className="f" htmlFor={`${idPrefix}-tags`}>Tags / Technologien (Komma-getrennt, optional)</label>
      <input className="f" id={`${idPrefix}-tags`} name="tags" defaultValue={row?.tagsText ?? ""} placeholder="React, Azure, SharePoint" />
    </>
  );
}

/** Die zweite Tabellenspalte: was diese Rubrik über einen Eintrag verrät. */
function factsFor(row: ResumeEntryRow): string {
  if (row.section === "SKILL") {
    const years = effectiveSkillYears(row);
    const level = row.skillLevel
      ? SKILL_LEVEL_LABEL[row.skillLevel as keyof typeof SKILL_LEVEL_LABEL]?.de ?? null
      : null;
    return [years && years > 0 ? `${years} ${years === 1 ? "Jahr" : "Jahre"}` : null, level]
      .filter(Boolean)
      .join(" · ");
  }
  if (row.section === "PROJECT") {
    const project = formatPeriod(row.projectFrom, row.projectTo);
    return [
      displayClient(row, "de"),
      project ? `Projekt: ${project}` : null,
      formatPersonDays(row.personDays, "de"),
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return [row.subtitle, row.location].filter(Boolean).join(" · ");
}

export default function ResumeEntryTable({
  section,
  label,
  hint,
  rows,
  createAction,
  updateAction,
  deleteAction,
  reorderAction,
  emptyText,
}: {
  section: ResumeSection;
  label: string;
  hint?: string;
  rows: ResumeEntryRow[];
  createAction: FormAction;
  updateAction: FormAction;
  deleteAction: FormAction;
  reorderAction: FormAction;
  emptyText: string;
}) {
  const [editing, setEditing] = useState<ResumeEntryRow | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <p className="eyebrow" style={{ margin: 0 }}>{label}</p>
        <button type="button" className="btn solid sm" style={{ marginLeft: "auto" }} onClick={() => setCreating(true)}>
          + Eintrag anlegen
        </button>
      </div>
      {hint ? <p className="meta" style={{ marginTop: 6 }}>{hint}</p> : null}

      {rows.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 12 }}>
          <p className="muted" style={{ margin: 0 }}>{emptyText}</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="media-table">
            <thead>
              <tr>
                <th style={{ width: 130 }}>Zeitraum</th>
                <th>Titel</th>
                <th>Details</th>
                <th style={{ width: 190 }}>
                  <span className="visually-hidden">Reihenfolge und Aktionen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="meta" style={{ whiteSpace: "nowrap" }}>
                    {formatPeriod(r.periodFrom, r.periodTo) ?? "—"}
                  </td>
                  <td>
                    <b>{r.title}</b>
                    {r.description ? <div className="meta">{shorten(r.description)}</div> : null}
                  </td>
                  <td className="meta">{factsFor(r) || "—"}</td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <form action={reorderAction} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="section" value={section} />
                      <input type="hidden" name="dir" value="up" />
                      <button className="btn ghost sm" type="submit" aria-label={`„${r.title}“ nach oben`} disabled={i === 0}>
                        ↑
                      </button>
                    </form>{" "}
                    <form action={reorderAction} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="section" value={section} />
                      <input type="hidden" name="dir" value="down" />
                      <button
                        className="btn ghost sm"
                        type="submit"
                        aria-label={`„${r.title}“ nach unten`}
                        disabled={i === rows.length - 1}
                      >
                        ↓
                      </button>
                    </form>{" "}
                    <button type="button" className="btn ghost sm" onClick={() => setEditing(r)}>
                      Bearbeiten
                    </button>{" "}
                    <form action={deleteAction} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="section" value={section} />
                      <ConfirmButton confirmText={`„${r.title}“ aus dem Lebenslauf entfernen?`}>Löschen</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <ModalDialog title={`Bearbeiten: ${editing.title}`} onClose={() => setEditing(null)}>
          <form action={updateAction}>
            <EntryFields row={editing} section={section} idPrefix={`edit-${editing.id}`} />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn solid sm" type="submit">Speichern</button>
              <button type="button" className="btn ghost sm" onClick={() => setEditing(null)}>Abbrechen</button>
            </div>
          </form>
        </ModalDialog>
      ) : null}

      {creating ? (
        <ModalDialog title={`Neuer Eintrag: ${label}`} onClose={() => setCreating(false)}>
          <form action={createAction}>
            <EntryFields section={section} idPrefix={`new-${section}`} />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn solid sm" type="submit">Anlegen</button>
              <button type="button" className="btn ghost sm" onClick={() => setCreating(false)}>Abbrechen</button>
            </div>
          </form>
        </ModalDialog>
      ) : null}
    </div>
  );
}
