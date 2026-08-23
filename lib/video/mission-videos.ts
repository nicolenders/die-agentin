// Videos an einem Einsatz.
//
// Ein Video ist eine Publikation mit `type = "VIDEO"` (siehe ADR 0025). Der
// Einsatzbezug hängt an `Publication.missionId` — eine Aufzeichnung gehört zu
// genau einem Auftritt, ein Auftritt kann mehrere Aufzeichnungen haben
// (Mitschnitt, Interview danach, Ausschnitt eines Veranstalters).
//
// Hier steht nur das, was sich ohne Datenbank prüfen lässt.

import { extractYouTubeId } from "./youtube";

export interface VideoChoice {
  id: string;
  title: string;
  channel: string | null;
  year: number;
  videoId: string | null;
  /** Der Einsatz, an dem das Video schon hängt — null, wenn frei. */
  missionId: string | null;
  missionName: string | null;
}

/**
 * Welche Videos lassen sich diesem Einsatz zuordnen?
 *
 * Freie zuerst, danach die schon anderswo zugeordneten — die bleiben wählbar,
 * damit sich eine falsche Zuordnung ohne Umweg umhängen lässt, stehen aber
 * hinten und tragen den Namen ihres bisherigen Einsatzes.
 *
 * Videos, die bereits an DIESEM Einsatz hängen, fallen heraus: Sie stehen schon
 * in der Liste darunter, und sie ein zweites Mal anzubieten wäre eine Falle.
 */
export function selectableVideos(all: VideoChoice[], missionId: string | null): VideoChoice[] {
  const free: VideoChoice[] = [];
  const taken: VideoChoice[] = [];
  for (const video of all) {
    if (missionId && video.missionId === missionId) continue;
    (video.missionId ? taken : free).push(video);
  }
  const byTitle = (a: VideoChoice, b: VideoChoice) => a.title.localeCompare(b.title, "de");
  return [...free.sort(byTitle), ...taken.sort(byTitle)];
}

/** Beschriftung im Auswahlfeld: Titel, Kanal, und woher es ggf. abgezogen wird. */
export function videoChoiceLabel(video: VideoChoice): string {
  const parts = [video.title];
  if (video.channel) parts.push(video.channel);
  parts.push(String(video.year));
  const base = parts.join(" · ");
  return video.missionName ? `${base} — hängt an „${video.missionName}“` : base;
}

/**
 * Taugt die Adresse am Einsatz („Aufzeichnung") dazu, daraus eine Publikation
 * zu machen — und ist das nicht längst geschehen?
 *
 * Der Vergleich läuft über die Kennung, nicht über die Zeichenkette: Dieselbe
 * Aufzeichnung steht am Einsatz gern als `youtu.be/…` und in der Publikation
 * als `watch?v=…`. Ein Textvergleich würde sie für zwei verschiedene halten und
 * einen Doppeleintrag anbieten.
 */
export function recordingWorthImporting(
  recordingUrl: string | null | undefined,
  linked: { videoId: string | null }[],
): string | null {
  const videoId = extractYouTubeId(recordingUrl ?? null);
  if (!videoId) return null;
  return linked.some((v) => v.videoId === videoId) ? null : videoId;
}
