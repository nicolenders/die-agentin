"use client";

import { useState } from "react";
import type { EmbedLabels } from "@/lib/content/embed-labels";

// YouTube-Einbindung mit Zwei-Klick-Lösung (SPEC §8, §12.2). Erst nach
// Zustimmung wird eine Verbindung zu youtube-nocookie.com hergestellt. Das
// Overlay liegt auf dem jeweiligen Video, kein seitenweites Banner.
//
// Die Texte kommen als Props herein (`embedLabels`), sie standen vorher fest auf
// Deutsch im Bauteil — auch auf den englischen Seiten.
export default function VideoConsent({
  videoId,
  title,
  labels,
}: {
  videoId: string;
  title?: string;
  labels: EmbedLabels;
}) {
  const [loaded, setLoaded] = useState(false);
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  if (loaded) {
    return (
      <div className="video-embed">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1`}
          title={title ?? labels.videoFallbackTitle}
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
          {labels.videoExternal}
        </p>
        {title ? <p style={{ color: "var(--text)" }}>{title}</p> : null}
        <p>{labels.videoConsentNotice}</p>
        <button type="button" className="btn" onClick={() => setLoaded(true)}>
          {labels.videoLoad}
        </button>
        <p className="meta" style={{ marginTop: 12 }}>
          {labels.videoAlternative}{" "}
          <a href={watchUrl} target="_blank" rel="noopener noreferrer">
            {labels.videoWatchOnYoutube}
          </a>
        </p>
      </div>
    </div>
  );
}
