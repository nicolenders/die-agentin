"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AssetImage from "@/components/media/AssetImage";
import { MEDIA_SOURCES, SOURCE_LABEL, toMediaSource, type MediaSource } from "@/lib/media/source";

export interface MediaItem {
  id: string;
  url: string;
  altDe: string;
  altEn?: string | null;
  width?: number;
  height?: number;
  decorative?: boolean;
  source?: string;
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
  const [q, setQ] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"" | MediaSource>("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (sourceFilter && toMediaSource(it.source) !== sourceFilter) return false;
      if (needle && !`${it.altDe} ${it.altEn ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, q, sourceFilter]);

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
    const formEl = e.currentTarget;
    try {
      const form = new FormData(formEl);
      const res = await fetch("/api/admin/media", { method: "POST", body: form });
      const raw = await res.text();
      let data: MediaItem & { error?: string };
      try {
        data = JSON.parse(raw);
      } catch {
        // Keine JSON-Antwort (z. B. HTML-Fehlerseite): Status + Auszug zeigen,
        // statt die eigentliche Ursache zu verschlucken.
        setError(`Upload fehlgeschlagen (HTTP ${res.status}). ${raw.slice(0, 140)}`.trim());
        return;
      }
      if (!res.ok) {
        setError(data.error ?? `Upload fehlgeschlagen (HTTP ${res.status}).`);
      } else {
        setItems((prev) => [data, ...prev]);
        formEl.reset();
      }
    } catch (err) {
      setError(`Upload fehlgeschlagen: ${err instanceof Error ? err.message : "Netzwerkfehler"}.`);
    } finally {
      setBusy(false);
    }
  }

  // Über ein Portal an <body> rendern: Der Picker wird u. a. aus Formularen
  // heraus geöffnet (Cover/Logo/Porträt). Als Kind eines <form> wäre das eigene
  // Upload-<form> verschachtelt (ungültig) und der Klick würde das äußere
  // Formular absenden — der Dialog „verschwände". Das Portal löst ihn aus jeder
  // transformierten/positionierten Elternkette und deckt zuverlässig den ganzen
  // Viewport ab.
  if (typeof document === "undefined") return null;

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Medienbibliothek"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,1,13,.92)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
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
          <label className="f" htmlFor="mp-source">Herkunft</label>
          <select className="f" id="mp-source" name="source" defaultValue="MINE">
            {MEDIA_SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
            ))}
          </select>
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
        ) : items.length === 0 ? (
          <p className="muted">Noch keine Medien.</p>
        ) : (
          <>
            <div className="year-filter" style={{ alignItems: "center", gap: 10 }}>
              <input
                className="f"
                style={{ maxWidth: 220 }}
                placeholder="Suche (Alt-Text) …"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Medien durchsuchen"
              />
              <select className="f" style={{ maxWidth: 190 }} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as "" | MediaSource)} aria-label="Nach Herkunft filtern">
                <option value="">Alle Herkünfte</option>
                {MEDIA_SOURCES.map((s) => (
                  <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="media-table">
                <thead>
                  <tr>
                    <th>Bild</th>
                    <th>Alt-Text</th>
                    <th>Herkunft</th>
                    <th>Größe</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <AssetImage
                          src={item.url}
                          alt={item.altDe || "Bild"}
                          ai={toMediaSource(item.source) === "AI"}
                          imgStyle={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4 }}
                        />
                      </td>
                      <td>{item.decorative ? <span className="meta">dekorativ</span> : item.altDe || <span className="meta">ohne Alt-Text</span>}</td>
                      <td className="meta">{SOURCE_LABEL[toMediaSource(item.source)]}</td>
                      <td className="meta" style={{ whiteSpace: "nowrap" }}>{item.width && item.height ? `${item.width}×${item.height}` : "—"}</td>
                      <td>
                        <button className="btn solid sm" type="button" onClick={() => onPick(item)}>Auswählen</button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5}><span className="muted">Keine Treffer.</span></td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
