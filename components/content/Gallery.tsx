"use client";

import { useRef } from "react";
import AssetImage from "@/components/media/AssetImage";

export interface GalleryImage {
  url?: string;
  alt: string;
  label?: string;
  ai?: boolean;
}

// Horizontal scrollbare Galerie (SPEC §11): role=region mit Label, per
// Pfeiltasten bedienbar, sichtbare Vor/Zurück-Schalter (nicht nur Wischgeste).
export default function Gallery({
  images,
  label,
  caption,
  aiLabel,
  aiTitle,
}: {
  images: GalleryImage[];
  label: string;
  caption?: string;
  // Hinweistexte für KI-generierte Bilder (Audit 6.9), serverseitig gebaut.
  aiLabel?: string;
  aiTitle?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollBy(direction: 1 | -1) {
    trackRef.current?.scrollBy({ left: direction * 300, behavior: "smooth" });
  }

  return (
    <div>
      <div className="galleryControls">
        <button
          type="button"
          className="btn ghost sm"
          aria-label="Zurück"
          onClick={() => scrollBy(-1)}
        >
          ←
        </button>
        <button
          type="button"
          className="btn ghost sm"
          aria-label="Vor"
          onClick={() => scrollBy(1)}
        >
          →
        </button>
      </div>
      <div
        className="gallery"
        role="region"
        aria-label={label}
        tabIndex={0}
        ref={trackRef}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            scrollBy(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            scrollBy(-1);
          }
        }}
      >
        {images.map((img, i) =>
          img.url ? (
            <AssetImage
              key={i}
              className="galleryItem"
              src={img.url}
              alt={img.alt}
              ai={img.ai}
              aiLabel={aiLabel}
              aiTitle={aiTitle}
            />
          ) : (
            <div key={i} className="ph galleryItem">
              {img.label ?? img.alt}
            </div>
          ),
        )}
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </div>
  );
}
