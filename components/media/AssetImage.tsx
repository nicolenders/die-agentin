"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

// Bild mit zwei anwendungsweiten Eigenschaften:
//  1. Ist es KI-generiert, erscheint unten rechts der Hinweis „KI-generiert".
//  2. Klick öffnet eine große Ansicht (Lightbox) — überall, wo Bilder/Thumbnails
//     angezeigt werden.
// Bewusst kein next/image (Same-Origin-Proxy /media liefert bereits optimierte
// WebP-Varianten; SPEC: keine Drittanbieter-Loader).
export default function AssetImage({
  src,
  alt,
  ai = false,
  className,
  style,
  imgStyle,
  loading = "lazy",
  zoom = true,
  aiLabel = "KI-generiert",
  aiTitle = "KI-generiertes Bild",
}: {
  src: string;
  alt: string;
  ai?: boolean;
  className?: string;
  style?: React.CSSProperties;
  imgStyle?: React.CSSProperties;
  loading?: "lazy" | "eager";
  zoom?: boolean;
  // Hinweistexte für KI-generierte Bilder (Audit 6.9). Als Prop, weil diese
  // Komponente im Client läuft und das Wörterbuch nicht ins Bundle soll. Die
  // deutschen Vorgaben gelten für die Redaktion, öffentliche Aufrufer reichen
  // die Sprachfassung durch.
  aiLabel?: string;
  aiTitle?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className={`asset-image${ai ? " is-ai" : ""}${className ? ` ${className}` : ""}`} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        onClick={zoom ? () => setOpen(true) : undefined}
        style={{ cursor: zoom ? "zoom-in" : undefined, ...imgStyle }}
      />
      {ai ? (
        <span className="ai-badge" aria-label={aiTitle}>
          {aiLabel}
        </span>
      ) : null}

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="lightbox"
              role="dialog"
              aria-modal="true"
              aria-label={alt || "Bild"}
              onClick={() => setOpen(false)}
            >
              <button className="lightbox-close" aria-label="Schließen" onClick={() => setOpen(false)}>
                ×
              </button>
              <figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} />
                {ai ? <span className="ai-badge">KI-generiert</span> : null}
                {alt ? <figcaption>{alt}</figcaption> : null}
              </figure>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
