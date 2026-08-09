// Herkunft eines Bildes. Bei KI-generierten Bildern wird überall, wo das Bild
// erscheint, ein Hinweis „KI-generiert" eingeblendet (Transparenz).
export const MEDIA_SOURCES = ["MINE", "OTHER", "AI"] as const;
export type MediaSource = (typeof MEDIA_SOURCES)[number];

export const SOURCE_LABEL: Record<MediaSource, string> = {
  MINE: "Eigenes Bild",
  OTHER: "Von jemand anderem",
  AI: "KI-generiert",
};

export function isMediaSource(value: string): value is MediaSource {
  return (MEDIA_SOURCES as readonly string[]).includes(value);
}

/** Normalisiert einen Eingabewert auf eine gültige Herkunft (Default: MINE). */
export function toMediaSource(value: string | null | undefined): MediaSource {
  return value && isMediaSource(value) ? value : "MINE";
}

export function isAiGenerated(source: string | null | undefined): boolean {
  return source === "AI";
}
