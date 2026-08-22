import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import { validateUpload } from "./detect";
import { processImage } from "./process";
import { storeFile } from "./storage";
import { toMediaSource } from "./source";

// Ein Bild von einer fremden Adresse in die eigene Medienablage holen.
//
// Gebraucht wird das für die YouTube-Vorschaubilder: Läge auf der
// Publikationsseite ein `<img src="https://i.ytimg.com/…">`, wäre jeder Aufruf
// der Seite eine Anfrage an Google — mit IP-Adresse und Referrer jedes Lesers,
// ohne dass jemand ein Video angeschaut hätte. CLAUDE.md schließt neue Anfragen
// an Drittanbieter ohne Zustimmungsprüfung aus, und für ein Vorschaubild ein
// Zustimmungsfeld zu bauen wäre die falsche Antwort. Also wird das Bild EINMAL
// beim Anlegen geholt und liegt danach unter der eigenen Adresse.
//
// Das Bild läuft durch dieselbe Prüfung wie ein Upload: echter Typ über die
// Magic Bytes, Metadaten entfernt, WebP-Varianten erzeugt. Was hereinkommt, ist
// hinterher nicht von einem hochgeladenen Bild zu unterscheiden.

/**
 * Von wo darf geholt werden. Das ist keine Formalie, sondern die Sperre gegen
 * SSRF: Ohne sie wäre dies eine Funktion, die auf Zuruf beliebige Adressen vom
 * Server aus abruft — auch solche im internen Netz oder den Metadatendienst der
 * Cloud. Es gilt genaue Gleichheit, kein `endsWith`; `ytimg.com.angreifer.example`
 * endet auch auf die richtige Zeichenfolge.
 */
const ALLOWED_HOSTS = new Set(["i.ytimg.com", "img.youtube.com", "i9.ytimg.com"]);

/** Ein Vorschaubild wiegt selten mehr als 200 KB; 8 MB sind reichlich Luft. */
const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

export type ImportResult =
  | { ok: true; assetId: string; width: number; height: number }
  | { ok: false; error: string };

export interface ImportOptions {
  url: string;
  altDe: string;
  /** MINE | OTHER | AI — ein fremdes Vorschaubild ist OTHER. */
  source?: string;
  credit?: string | null;
  /**
   * Mindestbreite. YouTube liefert für ein fehlendes `maxresdefault` ein graues
   * Ersatzbild mit Status 200 — erkennbar allein an seiner Größe.
   */
  minWidth?: number;
}

/**
 * Holt ein Bild und legt es als `MediaAsset` an. Gibt bei jedem Fehlschlag eine
 * Meldung zurück, statt zu werfen — der Aufrufer probiert dann die nächste
 * Adresse.
 */
export async function importImageFromUrl(options: ImportOptions): Promise<ImportResult> {
  const { url, altDe, source = "OTHER", credit = null, minWidth = 0 } = options;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "Keine gültige Adresse." };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Nur https ist zugelassen." };
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return { ok: false, error: `Von ${parsed.hostname} wird nichts geholt.` };
  }

  let bytes: Buffer;
  try {
    const response = await fetch(parsed.toString(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
      // Keiner Weiterleitung folgen: Sie könnte aus der erlaubten Liste
      // herausführen, und die Prüfung oben wäre umgangen.
      redirect: "error",
    });
    if (!response.ok) {
      return { ok: false, error: `Nicht abrufbar (HTTP ${response.status}).` };
    }
    const announced = Number(response.headers.get("content-length") ?? "");
    if (Number.isFinite(announced) && announced > MAX_BYTES) {
      return { ok: false, error: "Bild ist zu groß." };
    }
    const raw = Buffer.from(await response.arrayBuffer());
    if (raw.byteLength > MAX_BYTES) {
      return { ok: false, error: "Bild ist zu groß." };
    }
    bytes = raw;
  } catch {
    return { ok: false, error: "Bild konnte nicht geladen werden." };
  }

  const check = validateUpload(new Uint8Array(bytes));
  if (!check.ok) {
    return { ok: false, error: check.error ?? "Kein gültiges Bild." };
  }

  let processed;
  try {
    processed = await processImage(bytes);
  } catch {
    return { ok: false, error: "Bild konnte nicht verarbeitet werden." };
  }
  if (minWidth > 0 && processed.width < minWidth) {
    // Kein Fehler im engeren Sinn — nur nicht das, was gesucht war.
    return { ok: false, error: `Nur ${processed.width} px breit (mindestens ${minWidth} px erwartet).` };
  }

  const id = randomUUID();
  let stored: { w: number; format: string; path: string }[];
  try {
    stored = [];
    for (const variant of processed.variants) {
      const file = await storeFile(`${id}-${variant.w}.webp`, variant.buffer);
      stored.push({ w: variant.w, format: variant.format, path: file.path });
    }
  } catch (error) {
    console.error("[import-image] Ablage fehlgeschlagen:", error);
    return { ok: false, error: "Bild konnte nicht gespeichert werden." };
  }

  const largest = stored[stored.length - 1];
  if (!largest) return { ok: false, error: "Keine Bildvariante erzeugt." };

  try {
    const asset = await withDbRetry(() =>
      db.mediaAsset.create({
        data: {
          id,
          blobPath: largest.path,
          width: processed.width,
          height: processed.height,
          mime: "image/webp",
          altDe: altDe.slice(0, 300),
          decorative: false,
          source: toMediaSource(source),
          credit,
          variants: JSON.stringify(stored),
        },
      }),
    );
    return { ok: true, assetId: asset.id, width: processed.width, height: processed.height };
  } catch (error) {
    console.error("[import-image] Datenbanksatz fehlgeschlagen:", error);
    return { ok: false, error: "Eintrag konnte nicht gespeichert werden." };
  }
}
