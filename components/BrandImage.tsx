import { defaultLocale, type Locale } from "@/lib/i18n/config";
import { getDictionarySync } from "@/lib/i18n";

// Markenbild mit Platzhalter-Fallback. Liegt `src` vor, wird das Bild gezeigt;
// sonst ein gestalteter „Bildplatz" im Marken-Look (Zielmarke + Mono-Metazeile).
// Server-kompatibel (kein "use client").
export default function BrandImage({
  src,
  alt,
  label = "Bildplatz",
  sub = "Prompt: docs/BILDPROMPTS.md",
  ratio = "4 / 3",
  className = "",
  ai = false,
  fill = false,
  locale = defaultLocale,
}: {
  src: string | null;
  alt: string;
  label?: string;
  sub?: string;
  ratio?: string;
  className?: string;
  ai?: boolean;
  // Sprache für den Hinweis „KI-generiert" (Audit 6.9).
  locale?: Locale;
  // `fill`: das Bild füllt die volle Höhe seines (dann höhenbestimmenden) Eltern-
  // elements statt ein eigenes Seitenverhältnis vorzugeben — für Layouts, in denen
  // das Bild bündig mit einer Nachbarspalte abschließen soll. Das Bild bleibt
  // unverzerrt (object-fit: cover).
  fill?: boolean;
}) {
  return (
    <figure
      className={`brand-image bracket ${fill ? "brand-image--fill" : ""} ${className}`}
      style={fill ? { position: "relative" } : { aspectRatio: ratio, position: "relative" }}
    >
      {src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} />
          {ai ? (
            <span className="ai-badge">{getDictionarySync(locale).common.aiGenerated}</span>
          ) : null}
        </>
      ) : (
        <div className="brand-ph" role="img" aria-label={alt}>
          <div>
            <svg
              className="reticle"
              width="34"
              height="34"
              viewBox="0 0 34 34"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="17" cy="17" r="10.5" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
              <circle cx="17" cy="17" r="2.2" fill="currentColor" />
              <path d="M17 1v7M17 26v7M1 17h7M26 17h7" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <div className="label">{label}</div>
            <div className="sub">{sub}</div>
          </div>
        </div>
      )}
    </figure>
  );
}
