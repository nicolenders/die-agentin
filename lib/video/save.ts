import "server-only";
import { db } from "@/lib/db";
import { importImageFromUrl } from "@/lib/media/import-image";
import { fetchVideoMetadata } from "./oembed";
import { MIN_THUMBNAIL_WIDTH, youtubeThumbnailUrls, youtubeWatchUrl } from "./youtube";

// Ein Video als Publikation anlegen — einmal geschrieben, von zwei Stellen
// benutzt: dem Sammel-Import unter Publikationen und der Schnellerfassung an
// einem Einsatz. Beide brauchen dasselbe: Titel und Kanal von YouTube, das
// Vorschaubild in der eigenen Ablage, und keinen Doppeleintrag.

/**
 * Holt das Vorschaubild in die eigene Medienablage und hängt es an die
 * Publikation. Gibt zurück, ob es geklappt hat — der Aufrufer entscheidet, wie
 * laut er das meldet.
 *
 * Die Auflösungen werden der Reihe nach probiert: `maxresdefault` gibt es nicht
 * für jedes Video, und wo es fehlt, antwortet YouTube mit einem grauen
 * Ersatzbild statt mit einem Fehler. Deshalb die Mindestbreite — sie ist das
 * Einzige, woran sich der Platzhalter erkennen lässt.
 */
export async function attachVideoThumbnail(
  publicationId: string,
  videoId: string,
  title: string,
): Promise<boolean> {
  for (const url of youtubeThumbnailUrls(videoId)) {
    const result = await importImageFromUrl({
      url,
      altDe: `Vorschaubild: ${title}`.slice(0, 300),
      source: "OTHER",
      credit: "YouTube",
      minWidth: MIN_THUMBNAIL_WIDTH,
    });
    if (!result.ok) continue;
    try {
      await db.publication.update({
        where: { id: publicationId },
        data: { coverAssetId: result.assetId },
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export interface SavedVideo {
  id: string;
  title: string;
  /** Gab es das Video schon? Dann wurde nichts angelegt. */
  existed: boolean;
  /** Konnte das Vorschaubild geholt werden? */
  hasThumbnail: boolean;
}

/**
 * Legt ein Video als Publikation an — oder findet das vorhandene.
 *
 * Gesucht wird über die kanonische Adresse: Sie ist es, die hier geschrieben
 * wird, egal in welcher Form die Kennung hereinkam. Ein vorhandenes Video wird
 * NICHT überschrieben; nur der Einsatzbezug wird gesetzt, wenn einer mitkommt
 * und noch keiner da ist — sonst würde eine Schnellerfassung stillschweigend
 * eine bestehende Zuordnung umhängen.
 */
export async function saveVideoPublication(options: {
  videoId: string;
  year?: number | null;
  missionId?: string | null;
}): Promise<SavedVideo> {
  const { videoId, year, missionId = null } = options;
  const url = youtubeWatchUrl(videoId);

  const existing = await db.publication.findFirst({
    where: { type: "VIDEO", url },
    select: { id: true, missionId: true, coverAssetId: true, translations: { where: { locale: "de" }, select: { title: true } } },
  });

  if (existing) {
    if (missionId && !existing.missionId) {
      await db.publication.update({ where: { id: existing.id }, data: { missionId } });
    }
    return {
      id: existing.id,
      title: existing.translations[0]?.title ?? `YouTube-Video ${videoId}`,
      existed: true,
      hasThumbnail: Boolean(existing.coverAssetId),
    };
  }

  const meta = await fetchVideoMetadata(videoId);
  const title = meta.title ?? `YouTube-Video ${videoId}`;
  const publication = await db.publication.create({
    data: {
      type: "VIDEO",
      year: year ?? new Date().getUTCFullYear(),
      url,
      publisher: meta.channel,
      missionId,
      translations: { create: [{ locale: "de", title }] },
    },
  });

  return {
    id: publication.id,
    title,
    existed: false,
    hasThumbnail: await attachVideoThumbnail(publication.id, videoId, title),
  };
}
