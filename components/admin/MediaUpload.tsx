"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Upload-Feld der Medien-Bibliothek. Der eigentliche Upload läuft über die
// bestehende API (`/api/admin/media`, prüft Magic Bytes, entfernt Metadaten,
// erzeugt WebP-Varianten). Nach Erfolg wird die Server-Seite neu geladen, damit
// das neue Bild in der Liste erscheint.
export default function MediaUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setBusy(true);
    const formEl = e.currentTarget;
    try {
      const res = await fetch("/api/admin/media", { method: "POST", body: new FormData(formEl) });
      const raw = await res.text();
      let data: { error?: string };
      try {
        data = JSON.parse(raw);
      } catch {
        // Keine JSON-Antwort (z. B. HTML-Fehlerseite): Status + Auszug zeigen.
        setError(`Upload fehlgeschlagen (HTTP ${res.status}). ${raw.slice(0, 140)}`.trim());
        return;
      }
      if (!res.ok) {
        setError(data.error ?? `Upload fehlgeschlagen (HTTP ${res.status}).`);
      } else {
        formEl.reset();
        setOk(true);
        router.refresh();
      }
    } catch (err) {
      setError(`Upload fehlgeschlagen: ${err instanceof Error ? err.message : "Netzwerkfehler"}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card bracket">
      <p className="eyebrow">Neues Bild hochladen</p>
      <form onSubmit={handleUpload}>
        <label className="f" htmlFor="ml-file">Datei (JPEG, PNG, WebP, AVIF · max 20 MB)</label>
        <input className="f" id="ml-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required />
        <label className="f" htmlFor="ml-altde">Alt-Text (DE) · Pflicht (außer dekorativ)</label>
        <input className="f" id="ml-altde" name="altDe" placeholder="Was ist auf dem Bild zu sehen?" />
        <label className="f" htmlFor="ml-alten">Alt-Text (EN) · optional</label>
        <input className="f" id="ml-alten" name="altEn" />
        <label className="f" htmlFor="ml-source">Herkunft</label>
        <select className="f" id="ml-source" name="source" defaultValue="MINE">
          <option value="MINE">Eigenes Bild</option>
          <option value="OTHER">Von jemand anderem</option>
          <option value="AI">KI-generiert</option>
        </select>
        <label className="f" htmlFor="ml-credit">Bildnachweis · optional</label>
        <input className="f" id="ml-credit" name="credit" />
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontSize: 13 }}>
          <input type="checkbox" name="decorative" value="true" /> Dekoratives Bild (kein Alt-Text nötig)
        </label>
        <button className="btn solid sm" type="submit" disabled={busy} style={{ marginTop: 12 }}>
          {busy ? "Lädt hoch …" : "Hochladen"}
        </button>
      </form>
      {error ? <p className="st err" style={{ display: "inline-block", marginTop: 10 }}>{error}</p> : null}
      {ok ? <p className="st live" style={{ display: "inline-block", marginTop: 10 }}>Hochgeladen.</p> : null}
    </div>
  );
}
