// YouTube — Kennungen, Adressen, Sammel-Eingabe.
//
// Was diese Datei bewusst NICHT tut: einbetten. Auf der Website steht das
// Vorschaubild, und ein Klick führt zu YouTube — im neuen Tab, am Telefon in
// der App. Kein iframe heißt: kein Skript, kein Cookie, keine Verbindung zu
// Google, solange niemand klickt. Die Zwei-Klick-Einbettung
// (`components/content/VideoConsent.tsx`) bleibt für Videos IM Fließtext; eine
// Übersicht mit vielen Videos wäre damit eine Wand aus Zustimmungsfeldern.
//
// Auch das Vorschaubild kommt nicht von YouTube, sondern aus der eigenen
// Medienablage: Es wird einmal beim Anlegen geholt und liegt danach unter der
// eigenen Adresse (siehe lib/media/import-image.ts). Sonst wäre jeder Aufruf
// der Publikationsseite eine Anfrage an Google — genau das, was CLAUDE.md
// ohne Zustimmung ausschließt.

/** Eine YouTube-Video-Kennung: elf Zeichen aus einem festen Alphabet. */
const ID = /^[a-zA-Z0-9_-]{11}$/;

export function isYouTubeId(value: string): boolean {
  return ID.test(value);
}

/**
 * Video-Kennung aus einer Adresse — oder aus der Kennung selbst.
 *
 * Erkennt die Formen, die beim Kopieren aus dem Browser oder aus der App
 * entstehen: `watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`, `/live/` und
 * `/v/`. Alles andere ergibt `null`; geraten wird nicht.
 */
export function extractYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  if (ID.test(value)) return value;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return id && ID.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com" || host.endsWith(".youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && ID.test(v)) return v;
      const m = url.pathname.match(/\/(embed|shorts|v|live)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2]!;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Die Adresse zum Anschauen. Bewusst die kanonische `watch`-Adresse und nicht
 * `youtu.be`: Android und iOS erkennen sie und öffnen die YouTube-App, wenn sie
 * installiert ist — dafür braucht es kein eigenes App-Schema, das ohne
 * installierte App ins Leere liefe.
 */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

/**
 * Kandidaten für das Vorschaubild, vom besten zum sichersten.
 *
 * `maxresdefault` gibt es nicht für jedes Video — bei älteren oder in kleiner
 * Auflösung hochgeladenen fehlt es, und YouTube antwortet dann mit einem
 * grauen Platzhalter statt mit einem Fehler. `hqdefault` gibt es immer.
 * Deshalb wird der Reihe nach probiert und die erste brauchbare Datei genommen.
 */
export function youtubeThumbnailUrls(videoId: string): string[] {
  const id = encodeURIComponent(videoId);
  return [
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  ];
}

/**
 * YouTubes graues Ersatzbild ist 120×90 groß und wird mit Status 200
 * ausgeliefert — ein fehlendes `maxresdefault` sieht also aus wie ein Erfolg.
 * Erkannt wird es an der Größe: Ein echtes Vorschaubild ist mindestens 320 px
 * breit.
 */
export const MIN_THUMBNAIL_WIDTH = 320;

export interface ParsedVideoLine {
  /** Zeilennummer, 1-basiert — damit eine Fehlermeldung die Zeile nennen kann. */
  line: number;
  raw: string;
  videoId: string | null;
  /** Jahr, wenn hinter der Adresse eines stand. */
  year: number | null;
}

export interface ParsedVideoList {
  ok: ParsedVideoLine[];
  /** Zeilen ohne erkennbare Kennung — sie werden gemeldet, nicht verschluckt. */
  bad: ParsedVideoLine[];
  /** Kennungen, die mehrfach in der Eingabe standen. */
  duplicates: string[];
}

/**
 * Zerlegt die Sammel-Eingabe: eine Adresse je Zeile, optional gefolgt von
 * `| Jahr`. Leerzeilen und Zeilen, die mit `#` beginnen, werden übergangen.
 *
 * Doppelte werden zusammengefasst statt doppelt angelegt — beim Zusammentragen
 * aus mehreren Kanälen landet dieselbe Adresse leicht zweimal in der Liste.
 */
export function parseVideoList(text: string): ParsedVideoList {
  const ok: ParsedVideoLine[] = [];
  const bad: ParsedVideoLine[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const raw = rawLine.trim();
    if (!raw || raw.startsWith("#")) return;

    const [addressPart, yearPart] = raw.split("|").map((p) => p.trim());
    const videoId = extractYouTubeId(addressPart ?? "");
    const parsedYear = Number.parseInt(yearPart ?? "", 10);
    const year = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100 ? parsedYear : null;
    const entry: ParsedVideoLine = { line: index + 1, raw, videoId, year };

    if (!videoId) {
      bad.push(entry);
      return;
    }
    if (seen.has(videoId)) {
      duplicates.push(videoId);
      return;
    }
    seen.add(videoId);
    ok.push(entry);
  });

  return { ok, bad, duplicates };
}

/** Wie viele Videos ein Sammel-Import auf einmal aufnimmt. */
export const MAX_IMPORT_LINES = 100;
