import { extractYouTubeId, youtubeWatchUrl } from "./youtube";

// Titel und Kanal zu einem Video — über YouTubes oEmbed-Schnittstelle.
//
// Warum oEmbed und nicht die Data-API: oEmbed braucht keinen Schlüssel, keine
// Registrierung und kein Kontingent. Für „Titel und Kanalname zu einer Adresse"
// reicht das vollständig, und es kommt kein weiterer Dienst ins Projekt, der
// gepflegt werden müsste (CLAUDE.md: erst begründen, dann fragen).
//
// Die Anfrage läuft auf dem SERVER, einmal beim Anlegen. Auf der Website
// entsteht dadurch keine Verbindung zu Google — dort steht nur, was hier in die
// eigene Datenbank geschrieben wurde.
//
// Was oEmbed nicht liefert: das Veröffentlichungsdatum. Dafür gäbe es nur die
// Data-API mit Schlüssel. Deshalb kann beim Sammel-Import je Zeile ein Jahr
// mitgegeben werden, und sonst steht das laufende Jahr da, änderbar wie jedes
// andere Feld.

export interface VideoMetadata {
  title: string | null;
  channel: string | null;
}

/**
 * Liest die Antwort von oEmbed. Getrennt vom Abruf, damit sich das Verhalten
 * bei unvollständigen oder unerwarteten Antworten prüfen lässt, ohne zu
 * telefonieren.
 */
export function parseOEmbed(payload: unknown): VideoMetadata {
  if (!payload || typeof payload !== "object") return { title: null, channel: null };
  const data = payload as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const channel = typeof data.author_name === "string" ? data.author_name.trim() : "";
  return { title: title || null, channel: channel || null };
}

/** Zeitlimit je Abruf. Beim Sammel-Import summiert sich Warten schnell. */
const TIMEOUT_MS = 8000;

/**
 * Titel und Kanal zu einer Video-Kennung. Gibt bei jedem Fehlschlag
 * `{title: null, channel: null}` zurück statt zu werfen: Ein Video ohne Titel
 * ist ein Eintrag, den Nicole benennen kann — ein abgebrochener Import wäre
 * schlimmer.
 */
export async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata> {
  if (!extractYouTubeId(videoId)) return { title: null, channel: null };
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeWatchUrl(videoId))}&format=json`;
  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Kein Zwischenspeicher: Der Abruf passiert einmal je Video.
      cache: "no-store",
    });
    if (!response.ok) return { title: null, channel: null };
    return parseOEmbed(await response.json());
  } catch {
    // Nicht erreichbar, Zeitüberschreitung, kein JSON — alles derselbe Fall.
    return { title: null, channel: null };
  }
}
