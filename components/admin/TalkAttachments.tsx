"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ModalDialog from "@/components/admin/ModalDialog";
import { showToast } from "@/lib/admin/toast";
import { uploadTalkAttachment } from "@/lib/admin/upload-template";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_KINDS,
  ATTACHMENT_KIND_LABEL,
  ATTACHMENT_TOO_LARGE,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_MB,
  formatBytes,
  guessAttachmentKind,
  isPreviewable,
  toAttachmentKind,
} from "@/lib/briefings/attachments";

// Material am Briefing: Anleitungen, Notizen, Demo-Dateien, Videos.
//
// Eine Tabelle statt gestapelter Formulare — bei zehn Dateien wäre alles andere
// eine Endlosseite. Bearbeitet wird in einem Dialog; heruntergeladen über eine
// Route mit Rollenprüfung, nicht über den öffentlichen Medien-Proxy.

export interface AttachmentRow {
  id: string;
  kind: string;
  title: string;
  note: string;
  fileName: string;
  mime: string;
  bytes: number;
  sortOrder: number;
}

type FormAction = (formData: FormData) => void | Promise<void>;

/** Kürzel für die Vorschauspalte, wenn es kein Bild ist. */
function typeLabel(fileName: string): string {
  return (fileName.split(".").pop() ?? "").toUpperCase().slice(0, 4) || "DATEI";
}

export default function TalkAttachments({
  talkId,
  rows,
  saveAction,
  deleteAction,
}: {
  talkId: string | null;
  rows: AttachmentRow[];
  saveAction: FormAction;
  deleteAction: FormAction;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AttachmentRow | null>(null);

  async function handle(chosen: File) {
    if (!talkId) return;
    setError(null);
    if (chosen.size > MAX_ATTACHMENT_BYTES) {
      // Vorher absagen: bei 400 MB wäre die Alternative, minutenlang zu
      // übertragen und dann eine Absage zu bekommen.
      setError(`${ATTACHMENT_TOO_LARGE} (${formatBytes(chosen.size)})`);
      return;
    }
    setBusy(true);
    setProgress({ done: 0, total: 1 });
    const result = await uploadTalkAttachment(
      chosen,
      talkId,
      guessAttachmentKind(chosen.name),
      (done, total) => setProgress({ done, total }),
    );
    setBusy(false);
    setProgress(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast(`${result.fileName}: hinterlegt, ${formatBytes(result.bytes)}.`);
    router.refresh();
  }

  if (!talkId) {
    return (
      <div className="card bracket">
        <p className="meta" style={{ margin: 0 }}>
          Erst das Briefing anlegen, dann lässt sich Material hinterlegen — die Dateien hängen an
          diesem Briefing.
        </p>
      </div>
    );
  }

  return (
    <div className="card bracket">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <p className="meta" style={{ margin: 0, flex: "1 1 320px" }}>
          Alles, was zur Vorbereitung gehört: Anleitungen, Notizen, Demo-Dateien, Videos. Interne
          Ablage — nichts davon erscheint auf der Website. Max. {MAX_ATTACHMENT_MB} MB je Datei.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          style={{ display: "none" }}
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            if (chosen) void handle(chosen);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="btn solid sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy
            ? progress
              ? `Lädt hoch … Teil ${progress.done} von ${progress.total}`
              : "Lädt hoch …"
            : "+ Datei hochladen"}
        </button>
      </div>
      {error ? <p className="media-error">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="muted" style={{ marginTop: 14, marginBottom: 0 }}>
          Noch kein Material. Die erste Anleitung oder Demo-Datei landet mit einem Klick hier.
        </p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 14 }}>
          <table className="media-table">
            <thead>
              <tr>
                <th style={{ width: 88 }}>Vorschau</th>
                <th>Titel</th>
                <th style={{ width: 130 }}>Art</th>
                <th>Datei</th>
                <th style={{ width: 90 }}>Größe</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {isPreviewable(r.mime) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/admin/briefings/files/${r.id}?inline=1`}
                        alt=""
                        style={{
                          width: 72,
                          height: 48,
                          objectFit: "contain",
                          borderRadius: 4,
                          background: "var(--surface-2, #1a1420)",
                        }}
                      />
                    ) : (
                      <span
                        aria-hidden
                        style={{
                          display: "grid",
                          placeItems: "center",
                          width: 72,
                          height: 48,
                          borderRadius: 4,
                          border: "1px solid var(--line-soft)",
                          background: "var(--surface-2, #1a1420)",
                          fontFamily: "var(--mono)",
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          color: "var(--muted)",
                        }}
                      >
                        {typeLabel(r.fileName)}
                      </span>
                    )}
                  </td>
                  <td>
                    <b>{r.title}</b>
                    {r.note ? <div className="meta">{r.note}</div> : null}
                  </td>
                  <td className="meta">{ATTACHMENT_KIND_LABEL[toAttachmentKind(r.kind)]}</td>
                  <td className="meta" style={{ wordBreak: "break-all" }}>{r.fileName}</td>
                  <td className="meta" style={{ whiteSpace: "nowrap" }}>{formatBytes(r.bytes)}</td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <a className="btn ghost sm" href={`/api/admin/briefings/files/${r.id}`} download={r.fileName}>
                      ⬇ Laden
                    </a>{" "}
                    <button type="button" className="btn ghost sm" onClick={() => setEditing(r)}>
                      Bearbeiten
                    </button>{" "}
                    <form action={deleteAction} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="talkId" value={talkId} />
                      <ConfirmButton confirmText={`„${r.title}" samt Datei löschen?`}>Löschen</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <ModalDialog title={`Material bearbeiten: ${editing.fileName}`} onClose={() => setEditing(null)}>
          <form action={saveAction}>
            <input type="hidden" name="id" value={editing.id} />
            <input type="hidden" name="talkId" value={talkId} />

            <label className="f" htmlFor="att-title" style={{ marginTop: 12 }}>Titel</label>
            <input className="f" id="att-title" name="title" defaultValue={editing.title} required />

            <label className="f" htmlFor="att-kind">Art</label>
            <select className="f" id="att-kind" name="kind" defaultValue={toAttachmentKind(editing.kind)}>
              {ATTACHMENT_KINDS.map((k) => (
                <option key={k} value={k}>{ATTACHMENT_KIND_LABEL[k]}</option>
              ))}
            </select>

            <label className="f" htmlFor="att-note">Notiz (optional)</label>
            <textarea
              className="f"
              id="att-note"
              name="note"
              rows={3}
              defaultValue={editing.note}
              placeholder="Wofür ist die Datei — und was muss man wissen, bevor man sie benutzt?"
            />

            <label className="f" htmlFor="att-sort" style={{ display: "inline" }}>Reihenfolge</label>{" "}
            <input id="att-sort" name="sortOrder" type="number" defaultValue={editing.sortOrder} style={{ width: 90 }} />

            <p className="meta" style={{ marginTop: 12 }}>
              Die Datei selbst bleibt unverändert. Zum Austauschen die neue hochladen und die alte
              löschen — so ist immer klar, was gerade gilt.
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn solid sm" type="submit">Speichern</button>
              <button type="button" className="btn ghost sm" onClick={() => setEditing(null)}>Abbrechen</button>
            </div>
          </form>
        </ModalDialog>
      ) : null}
    </div>
  );
}
