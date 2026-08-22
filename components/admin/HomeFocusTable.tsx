"use client";

import { useState } from "react";
import AssetPickerField from "@/components/admin/AssetPickerField";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ModalDialog from "@/components/admin/ModalDialog";

// „Woran ich gerade arbeite": Die Werkzeuge stehen als Tabelle da — eine Zeile
// je Eintrag, mit Logo, Titel, Reihenfolge und Sichtbarkeit auf einen Blick.
// Bearbeitet wird in einem Dialog, damit die Übersicht Übersicht bleibt und
// nicht aus zehn ausgeklappten Formularen besteht.

export interface HomeFocusRow {
  id: string;
  titleDe: string;
  titleEn: string;
  textDe: string;
  textEn: string;
  iconAssetId: string | null;
  iconUrl: string | null;
  active: boolean;
  sortOrder: number;
}

type FormAction = (formData: FormData) => void | Promise<void>;

/** Felder eines Eintrags — identisch für „bearbeiten" und „neu anlegen". */
function FocusFields({ row, idPrefix }: { row?: HomeFocusRow; idPrefix: string }) {
  return (
    <>
      <div className="grid g2" style={{ alignItems: "start", marginTop: 12 }}>
        <div>
          <label className="f" htmlFor={`${idPrefix}-titleDe`}>Titel (DE)</label>
          <input className="f" id={`${idPrefix}-titleDe`} name="titleDe" defaultValue={row?.titleDe ?? ""} placeholder="z. B. Copilot Studio" required />
          <label className="f" htmlFor={`${idPrefix}-textDe`}>Text (DE)</label>
          <textarea
            className="f"
            id={`${idPrefix}-textDe`}
            name="textDe"
            rows={3}
            defaultValue={row?.textDe ?? ""}
            placeholder="Ein Satz: woran du damit gerade arbeitest."
            required
          />
        </div>
        <div>
          <label className="f" htmlFor={`${idPrefix}-titleEn`}>Titel (EN, optional)</label>
          <input className="f" id={`${idPrefix}-titleEn`} name="titleEn" defaultValue={row?.titleEn ?? ""} />
          <label className="f" htmlFor={`${idPrefix}-textEn`}>Text (EN, optional)</label>
          <textarea className="f" id={`${idPrefix}-textEn`} name="textEn" rows={3} defaultValue={row?.textEn ?? ""} />
        </div>
      </div>

      <label className="f" style={{ marginTop: 12 }}>Logo / Bild</label>
      <AssetPickerField
        name="iconAssetId"
        initialAssetId={row?.iconAssetId ?? null}
        initialUrl={row?.iconUrl ?? null}
        aspectRatio="1 / 1"
        width={72}
        objectFit="contain"
        emptyHint="Kein Logo gewählt"
      />

      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", marginTop: 14 }}>
        <span>
          <label className="f" htmlFor={`${idPrefix}-sortOrder`} style={{ display: "inline" }}>Reihenfolge</label>{" "}
          <input id={`${idPrefix}-sortOrder`} name="sortOrder" type="number" defaultValue={row?.sortOrder ?? 0} style={{ width: 90 }} />
        </span>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="active" defaultChecked={row ? row.active : true} />
          Auf der Startseite zeigen
        </label>
      </div>
    </>
  );
}

export default function HomeFocusTable({
  rows,
  saveAction,
  createAction,
  deleteAction,
  roomLeft,
  max,
}: {
  rows: HomeFocusRow[];
  saveAction: FormAction;
  createAction: FormAction;
  deleteAction: FormAction;
  roomLeft: number;
  max: number;
}) {
  const [editing, setEditing] = useState<HomeFocusRow | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <p className="meta" style={{ margin: 0 }}>
          Höchstens {max} sichtbare Einträge, damit die Reihe auf der Startseite eine Reihe bleibt.{" "}
          {roomLeft > 0 ? `Noch ${roomLeft} frei.` : "Alle Plätze belegt."}
        </p>
        <button type="button" className="btn solid sm" style={{ marginLeft: "auto" }} onClick={() => setCreating(true)}>
          + Eintrag anlegen
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 14 }}>
          <p className="muted" style={{ margin: 0 }}>
            Noch nichts eingetragen. Der erste Eintrag zeigt, woran du gerade arbeitest — Logo,
            Titel und ein Satz genügen.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 14 }}>
          <table className="media-table">
            <thead>
              <tr>
                <th style={{ width: 64 }}>Logo</th>
                <th>Titel</th>
                <th>Text (DE)</th>
                <th style={{ width: 110 }}>Reihenfolge</th>
                <th style={{ width: 120 }}>Sichtbar</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.iconUrl} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
                    ) : (
                      <span className="meta">—</span>
                    )}
                  </td>
                  <td>
                    <b>{r.titleDe}</b>
                    {r.titleEn ? <div className="meta">{r.titleEn}</div> : null}
                  </td>
                  <td className="meta">{r.textDe.length > 90 ? `${r.textDe.slice(0, 90)}…` : r.textDe}</td>
                  <td className="meta">{r.sortOrder}</td>
                  <td>
                    <span className={`st ${r.active ? "live" : "draft"}`}>{r.active ? "Sichtbar" : "Ausgeblendet"}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <button type="button" className="btn ghost sm" onClick={() => setEditing(r)}>
                      Bearbeiten
                    </button>{" "}
                    <form action={deleteAction} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton confirmText={`Eintrag „${r.titleDe}" von der Startseite löschen?`}>
                        Löschen
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <ModalDialog title={`Eintrag bearbeiten: ${editing.titleDe}`} onClose={() => setEditing(null)}>
          <form action={saveAction}>
            <input type="hidden" name="id" value={editing.id} />
            <FocusFields row={editing} idPrefix={`edit-${editing.id}`} />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn solid sm" type="submit">Speichern</button>
              <button type="button" className="btn ghost sm" onClick={() => setEditing(null)}>Abbrechen</button>
            </div>
          </form>
        </ModalDialog>
      ) : null}

      {creating ? (
        <ModalDialog title="Neuer Eintrag" onClose={() => setCreating(false)}>
          {roomLeft === 0 ? (
            <p className="muted" style={{ marginTop: 12 }}>
              Alle {max} Plätze sind belegt. Blende erst einen Eintrag aus oder lösche ihn, dann ist
              wieder Platz.
            </p>
          ) : (
            <form action={createAction}>
              <FocusFields idPrefix="new" />
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button className="btn solid sm" type="submit">Eintrag anlegen</button>
                <button type="button" className="btn ghost sm" onClick={() => setCreating(false)}>Abbrechen</button>
              </div>
            </form>
          )}
        </ModalDialog>
      ) : null}
    </div>
  );
}
