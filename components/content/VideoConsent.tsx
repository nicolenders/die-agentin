"use client";

import { useState } from "react";

// YouTube-Einbindung mit Zwei-Klick-Lösung (SPEC §8, §12.2). Erst nach
// Zustimmung wird eine Verbindung zu youtube-nocookie.com hergestellt. Das
// Overlay liegt auf dem jeweiligen Video, kein seitenweites Banner.
export default function VideoConsent({
  videoId,
  title,
}: {
  videoId: string;
  title?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  if (loaded) {
    return (
      <div className="video-embed">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1`}
          title={title ?? "YouTube-Video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="video-consent">
      <div>
        <p className="eyebrow" style={{ justifyContent: "center" }}>
          Externes Video · YouTube
        </p>
        {title ? <p style={{ color: "var(--text)" }}>{title}</p> : null}
        <p>
          Beim Abspielen wird eine Verbindung zu YouTube hergestellt und Daten
          werden an Google übertragen. Erst nach deiner Zustimmung wird das Video
          geladen.
        </p>
        <button type="button" className="btn" onClick={() => setLoaded(true)}>
          Video laden
        </button>
        <p className="meta" style={{ marginTop: 12 }}>
          Alternativ:{" "}
          <a href={watchUrl} target="_blank" rel="noopener noreferrer">
            direkt bei YouTube ansehen
          </a>
        </p>
      </div>
    </div>
  );
}
