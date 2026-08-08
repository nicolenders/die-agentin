"use client";

import { useState } from "react";
import MediaPicker, { type MediaItem } from "@/components/admin/editor/MediaPicker";

// Auswahl des Porträtbilds aus der Medienbibliothek. Legt die gewählte Asset-ID
// in ein verstecktes Formularfeld (`portraitAssetId`), das die Server-Action
// speichert. Ein hochgeladenes Bild überlebt Deployments (Blob-Storage).
export default function LegendPortraitField({
  initialAssetId,
  initialUrl,
}: {
  initialAssetId: string | null;
  initialUrl: string | null;
}) {
  const [assetId, setAssetId] = useState<string | null>(initialAssetId);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [picking, setPicking] = useState(false);

  function pick(item: MediaItem) {
    setAssetId(item.id);
    setUrl(item.url);
    setPicking(false);
  }

  return (
    <div>
      <input type="hidden" name="portraitAssetId" value={assetId ?? ""} />
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 120, aspectRatio: "4 / 5", border: "1px solid var(--line-soft)", borderRadius: 4, overflow: "hidden", background: "var(--surface-2, #1a1420)", display: "grid", placeItems: "center" }}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Porträt-Vorschau" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span className="meta" style={{ padding: 8, textAlign: "center" }}>Kein Bild — Platzhalter wird gezeigt</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button type="button" className="btn ghost sm" onClick={() => setPicking(true)}>Bild wählen / hochladen</button>
          {assetId ? (
            <button type="button" className="btn ghost sm" onClick={() => { setAssetId(null); setUrl(null); }}>Entfernen</button>
          ) : null}
        </div>
      </div>
      {picking ? <MediaPicker onPick={pick} onClose={() => setPicking(false)} /> : null}
    </div>
  );
}
