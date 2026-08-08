"use client";

import { useEffect, useState } from "react";

export interface MediaItem {
  id: string;
  url: string;
  altDe: string;
  altEn?: string | null;
  width?: number;
  height?: number;
  decorative?: boolean;
}

// Medienbibliothek als Modal (SPEC M2). Listet Assets, lädt neue hoch (Alt-Text
// ist Pflicht, außer dekorativ) und gibt die Auswahl an den Editor zurück.
export default function MediaPicker({
  onPick,
  onClose,
}: {
  onPick: (asset: MediaItem) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/media");
        if (!active) return;
        if (res.ok) setItems(await res.json());
        else setError("Medien konnten nicht geladen werden.");
      } catch {
        if (active) setError("Medien konnten nicht geladen werden.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const form = new FormData(e.currentTarget);
      const res = await fetch("/api/admin/media", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload fehlgeschlagen.");
      } else {
        setItems((prev) => [data, ...prev]);
        e.currentTarget.reset();
      }
    } catch {
      setError("Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Medienbibliothek"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,1,13,.8)",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card bracket media-modal"
        style={{ maxWidth: 760, width: "100%", maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <p className="eyebrow" style={{ margin: 0 }}>
            Medienbibliothek
          </p>
          <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={onClose}>
            Schließen
          </button>
        </div>

        <form onSubmit={handleUpload} style={{ margin: "16px 0", borderBottom: "1px solid var(--line-soft)", paddingBottom: 16 }}>
          <label className="f" htmlFor="mp-file">
            Datei (JPEG, PNG, WebP, AVIF · max 20 MB)
          </label>
          <input className="f" id="mp-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required />
          <label className="f" htmlFor="mp-altde">
            Alt-Text (DE) · Pflicht
          </label>
          <input className="f" id="mp-altde" name="altDe" placeholder="Was ist auf dem Bild zu sehen?" />
          <label className="f" htmlFor="mp-alten">
            Alt-Text (EN) · optional
          </label>
          <input className="f" id="mp-alten" name="altEn" />
          <label className="f" htmlFor="mp-credit">
            Bildnachweis · optional
          </label>
          <input className="f" id="mp-credit" name="credit" />
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontSize: 13 }}>
            <input type="checkbox" name="decorative" value="true" /> Dekoratives Bild (kein Alt-Text nötig)
          </label>
          <button className="btn solid sm" type="submit" disabled={busy} style={{ marginTop: 12 }}>
            {busy ? "Lädt hoch …" : "Hochladen"}
          </button>
        </form>

        {error ? <p className="media-error">{error}</p> : null}
        {loading ? (
          <p className="muted">Wird geladen …</p>
        ) : (
          <div className="grid g4">
            {items.map((item) => (
              <button
                key={item.id}
                className="card"
                style={{ padding: 8, textAlign: "left", cursor: "pointer" }}
                onClick={() => onPick(item)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.altDe} style={{ width: "100%", borderRadius: 4 }} />
                <span className="meta" style={{ display: "block", marginTop: 6 }}>
                  {item.decorative ? "dekorativ" : item.altDe || "ohne Alt-Text"}
                </span>
              </button>
            ))}
            {items.length === 0 ? <p className="muted">Noch keine Medien.</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
