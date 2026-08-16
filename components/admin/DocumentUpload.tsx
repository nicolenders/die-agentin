"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { showToast } from "@/lib/admin/toast";

// Upload einer Präsentation (PDF) in die Medienverwaltung. Nutzt dieselbe Route
// wie der Folien-Upload am Einsatz — die Datei landet in der Ablage und wird als
// Dokument vermerkt. Zuordnen lässt sie sich danach im Einsatz.
export default function DocumentUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const formEl = e.currentTarget;
    try {
      const res = await fetch("/api/admin/missions/slides", { method: "POST", body: new FormData(formEl) });
      const raw = await res.text();
      let data: { error?: string };
      try {
        data = JSON.parse(raw);
      } catch {
        setError(`Upload fehlgeschlagen (HTTP ${res.status}). ${raw.slice(0, 140)}`.trim());
        return;
      }
      if (!res.ok) {
        setError(data.error ?? `Upload fehlgeschlagen (HTTP ${res.status}).`);
        return;
      }
      formEl.reset();
      showToast("Präsentation hochgeladen.");
      router.refresh();
    } catch (err) {
      setError(`Upload fehlgeschlagen: ${err instanceof Error ? err.message : "Netzwerkfehler"}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card bracket">
      <p className="eyebrow">Präsentation hochladen (PDF)</p>
      <p className="meta" style={{ marginTop: 0 }}>
        Max. 20 MB. Erscheint danach unter „Präsentationen“ und lässt sich im Einsatz als
        Foliendownload verwenden.
      </p>
      <form onSubmit={handleUpload}>
        <label className="f" htmlFor="doc-file">Datei (PDF)</label>
        <input className="f" id="doc-file" name="file" type="file" accept="application/pdf,.pdf" required />
        <label className="f" htmlFor="doc-title">Beschreibung · optional</label>
        <input className="f" id="doc-title" name="title" placeholder="z. B. Keynote Copilot, CIM Lingen" />
        <button className="btn solid sm" type="submit" disabled={busy} style={{ marginTop: 12 }}>
          {busy ? "Lädt hoch …" : "Hochladen"}
        </button>
      </form>
      {error ? <p className="media-error">{error}</p> : null}
    </div>
  );
}
