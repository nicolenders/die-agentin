import "server-only";
import { isBlobConfigured, getBlobContainerClient } from "@/lib/media/storage";
import type { TickHint } from "@/lib/jobs/tick-plan";

// Die Terminnotiz: „vor diesem Zeitpunkt gibt es nichts zu tun."
//
// Sie liegt bewusst NICHT in der Datenbank — sie zu lesen soll die serverlose
// Datenbank ja gerade nicht wecken (docs/decisions/0032-kosten-der-laufzeit.md).
// Ablage ist deshalb ein kleines JSON im privaten Blob-Container `uploads`:
// von allen Replicas gemeinsam gelesen, ein Bruchteil eines Cents pro Monat,
// und kein zusätzlicher Dienst.
//
// Ohne Blob-Konfiguration (lokale Entwicklung, Tests) hält der Prozess die
// Notiz im Speicher. Das reicht dort, weil es nur einen Prozess gibt.

const CONTAINER = process.env.BLOB_CONTAINER_UPLOADS ?? "uploads";
const BLOB_NAME = "system/schedule-hint.json";

interface StoredHint {
  nextDueAt: string | null;
  writtenAt: string;
}

let inMemory: StoredHint | null = null;

// Löschen und Schreiben dürfen sich nicht überholen. Der Job-Lauf löst über
// `invalidateTags` selbst ein Löschen aus (er veröffentlicht ja) und schreibt
// danach die neue Notiz — käme das Löschen verspätet an, wäre die frische
// Notiz wieder weg und jeder folgende Tick liefe vollständig. Deshalb wartet
// das Schreiben auf ausstehende Löschvorgänge.
let pendingClear: Promise<void> = Promise.resolve();

function parse(raw: string): TickHint | null {
  try {
    const data = JSON.parse(raw) as Partial<StoredHint>;
    if (typeof data.writtenAt !== "string") return null;
    const writtenAt = new Date(data.writtenAt);
    if (Number.isNaN(writtenAt.getTime())) return null;
    const nextDueAt =
      typeof data.nextDueAt === "string" ? new Date(data.nextDueAt) : null;
    return {
      writtenAt,
      nextDueAt: nextDueAt && !Number.isNaN(nextDueAt.getTime()) ? nextDueAt : null,
    };
  } catch {
    return null;
  }
}

async function download(): Promise<string | null> {
  const blob = getBlobContainerClient(CONTAINER).getBlockBlobClient(BLOB_NAME);
  const buffer = await blob.downloadToBuffer();
  return buffer.toString("utf8");
}

/**
 * Liest die Notiz. Jeder Fehler — kein Blob, kein Zugriff, kaputtes JSON —
 * führt zu `null` und damit zu einem vollständigen Lauf. Das ist die sichere
 * Seite: lieber einmal zu viel geweckt als eine Veröffentlichung verschlafen.
 */
export async function readScheduleHint(): Promise<TickHint | null> {
  if (!isBlobConfigured()) return inMemory ? parse(JSON.stringify(inMemory)) : null;
  try {
    const raw = await download();
    return raw ? parse(raw) : null;
  } catch {
    return null;
  }
}

export async function writeScheduleHint(hint: TickHint): Promise<void> {
  await pendingClear.catch(() => undefined);
  const stored: StoredHint = {
    nextDueAt: hint.nextDueAt ? hint.nextDueAt.toISOString() : null,
    writtenAt: hint.writtenAt.toISOString(),
  };
  if (!isBlobConfigured()) {
    inMemory = stored;
    return;
  }
  try {
    const body = JSON.stringify(stored);
    await getBlobContainerClient(CONTAINER)
      .getBlockBlobClient(BLOB_NAME)
      .upload(body, Buffer.byteLength(body), {
        blobHTTPHeaders: { blobContentType: "application/json", blobCacheControl: "no-store" },
      });
  } catch (error) {
    // Ohne Notiz läuft der nächste Tick vollständig — teurer, aber korrekt.
    console.warn(
      "[job] Terminnotiz konnte nicht abgelegt werden:",
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Verwirft die Notiz. Wird von jeder Inhalts-Änderung ausgelöst
 * (`invalidateTags`), weil eine Änderung einen Termin verschoben haben kann.
 * Der nächste Tick sieht dann selbst nach.
 */
export async function clearScheduleHint(): Promise<void> {
  const run = async (): Promise<void> => {
    if (!isBlobConfigured()) {
      inMemory = null;
      return;
    }
    try {
      await getBlobContainerClient(CONTAINER).getBlockBlobClient(BLOB_NAME).deleteIfExists();
    } catch {
      // Bleibt die alte Notiz liegen, verfällt sie spätestens nach sechs Stunden.
    }
  };
  pendingClear = pendingClear.then(run, run);
  return pendingClear;
}
