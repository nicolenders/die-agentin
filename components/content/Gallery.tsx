"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { aspectRatio, justifyRows, targetRowHeight } from "@/lib/media/justified";

export interface GalleryImage {
  url?: string;
  alt: string;
  label?: string;
  ai?: boolean;
  /** Maße des Originals — daraus kommt das Seitenverhältnis der Kachel. */
  width?: number | null;
  height?: number | null;
}

export interface GalleryLabels {
  /** Beschriftung der Galerie als Ganzes. */
  region: string;
  open: string;
  prev: string;
  next: string;
  close: string;
  /** Vorlage mit `{n}` und `{total}`. */
  position: string;
  aiLabel: string;
  aiTitle: string;
}

/** Abstand zwischen zwei Kacheln — muss zur Regel `.mosaic-row { gap }` passen. */
const GAP = 10;
/**
 * Breite, mit der server- und erstseitig gerechnet wird. Erst nach dem Aufbau
 * wird gemessen; würde die erste Ausgabe im Browser schon die echte Breite
 * benutzen, wiche sie von der des Servers ab (Hydration).
 */
const ASSUMED_WIDTH = 880;

/**
 * Messen, bevor gezeichnet wird — sonst blitzt die angenommene Breite kurz auf.
 * Auf dem Server gibt es kein Layout; dort ist es ein gewöhnlicher Effekt, der
 * ohnehin nicht läuft. (React warnt sonst bei jedem Server-Rendering.)
 */
const useMeasureEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Bildergalerie als justierte Zeilen — jede Zeile füllt die Breite, alle Bilder
 * einer Zeile sind gleich hoch, kein Bild wird beschnitten. Hoch- und
 * Querformat dürfen sich also mischen, ohne dass Löcher oder Anschnitte
 * entstehen (siehe `lib/media/justified.ts`).
 *
 * Die Breitenverteilung innerhalb einer Zeile macht Flexbox: `flex-grow` im
 * Verhältnis der Seitenverhältnisse verteilt den Platz subpixelgenau, und über
 * `aspect-ratio` an der Kachel ergibt sich für alle dieselbe Höhe. Berechnet
 * wird hier nur, welche Bilder zusammen in eine Zeile gehören.
 */
export default function Gallery({
  images,
  labels,
  caption,
}: {
  images: GalleryImage[];
  labels: GalleryLabels;
  caption?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(ASSUMED_WIDTH);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Die Breite ändert sich beim Drehen des Telefons und beim Ziehen des
  // Fensters — ein Beobachter statt eines einmaligen Messens.
  useMeasureEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width || ASSUMED_WIDTH);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Der Platz jedes Bildes in der Galerie steht fest, bevor die Zeilen gebildet
  // werden: die Lightbox blättert über diesen Index, nicht über die Zeile.
  const indexed = useMemo(() => images.map((img, index) => ({ ...img, index })), [images]);
  const rows = justifyRows(indexed, (img) => aspectRatio(img.width, img.height), {
    containerWidth: width,
    gap: GAP,
    targetHeight: targetRowHeight(width),
  });

  // Nur vorhandene Bilder lassen sich groß ansehen; ein Platzhalter (fehlendes
  // Asset) bleibt eine Kachel und wird beim Blättern übersprungen.
  const openable = useMemo(() => indexed.filter((img) => Boolean(img.url)), [indexed]);
  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null || openable.length === 0) return current;
        const at = openable.findIndex((x) => x.index === current);
        const next = openable[(((at + delta) % openable.length) + openable.length) % openable.length];
        return next ? next.index : current;
      });
    },
    [openable],
  );

  const open = openIndex !== null ? images[openIndex] : null;
  const openPosition = open ? openable.findIndex((x) => x.index === openIndex) : -1;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "ArrowRight") step(1);
      else return;
      event.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, step]);

  const positionText = (index: number) =>
    labels.position.replace("{n}", String(index + 1)).replace("{total}", String(openable.length));

  return (
    <div>
      <div className="mosaic" role="region" aria-label={labels.region} ref={trackRef}>
        {rows.map((row, r) => (
          <div className={`mosaic-row${row.full ? "" : " short"}`} key={r}>
            {row.items.map((img) => {
              const index = img.index;
              const aspect = aspectRatio(img.width, img.height);
              // Volle Zeilen verteilt Flexbox; eine kurze letzte Zeile behält
              // ihre Höhe und damit eine feste Breite je Bild.
              const style = row.full
                ? { flexGrow: aspect, flexBasis: 0, aspectRatio: String(aspect) }
                : { flexGrow: 0, flexBasis: `${row.height * aspect}px`, aspectRatio: String(aspect) };
              if (!img.url) {
                return (
                  <div className="mosaic-item ph" key={index} style={style}>
                    {img.label ?? img.alt}
                  </div>
                );
              }
              return (
                <button
                  type="button"
                  className="mosaic-item"
                  key={index}
                  style={style}
                  onClick={() => setOpenIndex(index)}
                  aria-label={img.alt ? `${labels.open}: ${img.alt}` : labels.open}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt} loading="lazy" />
                  {img.ai ? (
                    <span className="ai-badge" aria-label={labels.aiTitle}>
                      {labels.aiLabel}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {caption ? <figcaption className="mosaic-caption">{caption}</figcaption> : null}

      {open?.url && typeof document !== "undefined"
        ? createPortal(
            <div
              className="lightbox"
              role="dialog"
              aria-modal="true"
              aria-label={open.alt || labels.region}
              onClick={() => setOpenIndex(null)}
            >
              <button className="lightbox-close" aria-label={labels.close} onClick={() => setOpenIndex(null)}>
                ×
              </button>
              {openable.length > 1 ? (
                <button
                  className="lightbox-nav prev"
                  aria-label={labels.prev}
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                >
                  <span aria-hidden>‹</span>
                </button>
              ) : null}
              <figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
                <span className="lightbox-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={open.url} alt={open.alt} />
                  {open.ai ? (
                    <span className="ai-badge" aria-label={labels.aiTitle}>
                      {labels.aiLabel}
                    </span>
                  ) : null}
                </span>
                {open.alt || openable.length > 1 ? (
                  <figcaption>
                    {open.alt}
                    {openable.length > 1 ? (
                      <span className="lightbox-count" aria-live="polite">
                        {positionText(openPosition)}
                      </span>
                    ) : null}
                  </figcaption>
                ) : null}
              </figure>
              {openable.length > 1 ? (
                <button
                  className="lightbox-nav next"
                  aria-label={labels.next}
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                >
                  <span aria-hidden>›</span>
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
