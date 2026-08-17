"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/admin/toast";
import type { UploadResult } from "@/lib/admin/upload-template";
import {
  MAX_SLIDE_TEMPLATE_BYTES,
  MAX_SLIDE_TEMPLATE_MB,
  SLIDE_TEMPLATE_ACCEPT,
  SLIDE_TEMPLATE_PART_BYTES,
  SLIDE_TEMPLATE_TOO_LARGE,
  formatMb,
} from "@/lib/slide-templates";

// Ein Platz für eine PowerPoint-Datei: anzeigen, herunterladen, ersetzen,
// entfernen. Genutzt an zwei Stellen mit demselben Verhalten — für die
// Vorlagen in der Medienverwaltung und für die Foliensätze an einem Briefing.
// Der Upload läuft in Teilstücken (siehe lib/admin/upload-template.ts); der
// Fortschritt steht auf der Schaltfläche, weil 40 MB spürbar dauern.

export interface StoredPptx {
  fileName: string;
  bytes: number;
  /** Fertige Download-URL (mit sprechendem Dateinamen). */
  url: string;
}

export default function PptxUploadSlot({
  title,
  file,
  description,
  emptyHint,
  upload,
  removeAction,
  disabled = false,
  disabledHint,
}: {
  title: string;
  file: StoredPptx | null;
  description?: ReactNode;
  emptyHint: ReactNode;
  /** Lädt hoch und meldet den Fortschritt. */
  upload: (file: File, onProgress: (done: number, total: number) => void) => Promise<UploadResult>;
  /** Formular mit Server Action zum Entfernen (Rollenprüfung dort). */
  removeAction?: ReactNode;
  /** Gesperrt, solange der Bezug fehlt (z. B. Briefing noch nicht angelegt). */
  disabled?: boolean;
  disabledHint?: ReactNode;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function handle(chosen: File) {
    setError(null);
    if (chosen.size > MAX_SLIDE_TEMPLATE_BYTES) {
      // Vor dem Hochladen absagen: bei 40-MB-Dateien wäre die Alternative,
      // minutenlang zu übertragen und dann eine Absage zu bekommen.
      setError(`${SLIDE_TEMPLATE_TOO_LARGE} (${formatMb(chosen.size)})`);
      return;
    }
    setBusy(true);
    setProgress({ done: 0, total: Math.ceil(chosen.size / SLIDE_TEMPLATE_PART_BYTES) });
    const result = await upload(chosen, (done, total) => setProgress({ done, total }));
    setBusy(false);
    setProgress(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    showToast(`${title}: hinterlegt — ${formatMb(result.bytes)}.`);
    router.refresh();
  }

  return (
    <div className="card bracket">
      <p className="eyebrow">{title}</p>
      {file ? (
        <>
          {description ? <p className="meta" style={{ marginTop: 0 }}>{description}</p> : null}
          <p style={{ margin: "8px 0" }}>
            <a className="btn ghost sm" href={file.url} download={file.fileName}>
              ⬇ {file.fileName}
            </a>{" "}
            {/* Die Größe steht sichtbar dabei: stimmt sie mit der Datei auf dem
                Rechner überein, ist die Präsentation vollständig angekommen. */}
            <span className="meta">{formatMb(file.bytes)}</span>
          </p>
        </>
      ) : (
        <p className="meta" style={{ marginTop: 0 }}>{emptyHint}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={SLIDE_TEMPLATE_ACCEPT}
        style={{ display: "none" }}
        onChange={(e) => {
          const chosen = e.target.files?.[0];
          if (chosen) void handle(chosen);
          e.target.value = "";
        }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          className="btn ghost sm"
          disabled={busy || disabled}
          onClick={() => inputRef.current?.click()}
        >
          {busy
            ? progress
              ? `Lädt hoch … Teil ${progress.done} von ${progress.total}`
              : "Lädt hoch …"
            : file
              ? "Ersetzen"
              : "PowerPoint hochladen"}
        </button>
        {file ? removeAction : null}
      </div>
      {disabled && disabledHint ? (
        <p className="meta" style={{ marginTop: 8 }}>{disabledHint}</p>
      ) : (
        <p className="meta" style={{ marginTop: 8 }}>
          .pptx oder .potx, max. {MAX_SLIDE_TEMPLATE_MB} MB. Große Dateien gehen in Teilstücken
          hoch; am Ende wird die abgelegte Datei geprüft, unvollständig Angekommenes abgelehnt.
        </p>
      )}
      {error ? <p className="media-error">{error}</p> : null}
    </div>
  );
}
