"use client";

import { useState } from "react";
import MediaPicker, { type MediaItem } from "@/components/admin/editor/MediaPicker";

// Auswahl eines Bilds aus der Medienbibliothek für ein beliebiges Formularfeld
// (z. B. Buchcover einer Publikation, Logo einer Zertifizierung). Die gewählte
// Asset-ID landet in einem versteckten Feld mit dem übergebenen `name`, das die
// Server-Action speichert. Ein hochgeladenes Bild überlebt Deployments
// (Blob-Storage), anders als Dateien im Repo.
export default function AssetPickerField({
  name,
  initialAssetId,
  initialUrl,
  aspectRatio = "3 / 4",
  width = 120,
  emptyHint = "Kein Bild gewählt",
  objectFit = "cover",
}: {
  name: string;
  initialAssetId: string | null;
  initialUrl: string | null;
  aspectRatio?: string;
  width?: number;
  emptyHint?: string;
  objectFit?: "cover" | "contain";
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
      <input type="hidden" name={name} value={assetId ?? ""} />
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          style={{
            width,
            aspectRatio,
            border: "1px solid var(--line-soft)",
            borderRadius: 4,
            overflow: "hidden",
            background: "var(--surface-2, #1a1420)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Bildvorschau" style={{ width: "100%", height: "100%", objectFit }} />
          ) : (
            <span className="meta" style={{ padding: 8, textAlign: "center" }}>{emptyHint}</span>
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
