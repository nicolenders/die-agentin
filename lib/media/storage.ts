import { mkdir, writeFile, stat, unlink, rm, open } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import path from "node:path";
import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

// Medienablage. Lokal: Dateien unter public/uploads/ (im Dev von Next
// ausgeliefert). Produktiv: Azure Blob Storage, Container `media`, per Managed
// Identity (kein Secret im Code) — die Identity und die Rolle „Storage Blob
// Data Contributor" liefert die Infrastruktur (infra/main.bicep), die Env-Vars
// BLOB_ACCOUNT_NAME / BLOB_CONTAINER_MEDIA / AZURE_CLIENT_ID die Container-App.
// Siehe docs/decisions/0005-media-storage.md.

export interface StoredFile {
  /** Relativer Pfad, wie in MediaAsset.blobPath / variants gespeichert. */
  path: string;
}

const LOCAL_DIR = path.join(process.cwd(), "public", "uploads");

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_ACCOUNT_NAME);
}

// Ein Client pro Prozess. DefaultAzureCredential nutzt in Produktion die
// user-assigned Managed Identity (über AZURE_CLIENT_ID), lokal z. B. `az login`.
let containerClient: ContainerClient | null = null;

function getContainerClient(): ContainerClient {
  if (containerClient) return containerClient;
  const account = process.env.BLOB_ACCOUNT_NAME;
  if (!account) {
    throw new Error("BLOB_ACCOUNT_NAME ist nicht gesetzt.");
  }
  const container = process.env.BLOB_CONTAINER_MEDIA ?? "media";
  const credential = new DefaultAzureCredential({
    managedIdentityClientId: process.env.AZURE_CLIENT_ID,
  });
  const service = new BlobServiceClient(`https://${account}.blob.core.windows.net`, credential);
  containerClient = service.getContainerClient(container);
  return containerClient;
}

/**
 * Speichert einen Datei-Buffer. Gibt den relativen Pfad zurück, der in der DB
 * abgelegt wird (`assetUrl` baut daraus die öffentliche URL). Produktiv landet
 * die Datei als Blob im `media`-Container; der Pfad ist dann der Blob-Name.
 */
export async function storeFile(
  relativePath: string,
  buffer: Buffer,
  contentType = "image/webp",
): Promise<StoredFile> {
  if (isBlobConfigured()) {
    const blob = getContainerClient().getBlockBlobClient(relativePath);
    await blob.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        // Dateinamen enthalten eine ID → Inhalt ist unveränderlich, lange cachebar.
        blobCacheControl: "public, max-age=31536000, immutable",
      },
    });
    return { path: relativePath };
  }
  const full = path.join(LOCAL_DIR, relativePath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer);
  return { path: `uploads/${relativePath}` };
}

// ---------------------------------------------------------------------------
// Mehrteiliger Upload
//
// Eine 42-MB-Vorlage in einer einzigen Anfrage über das Ingress zu schieben ist
// die fragilste Stelle der ganzen Strecke: ein Abbruch unterwegs kommt als
// sauberes Dateiende an, und was ankommt, sieht aus wie eine gültige Datei —
// nur eben eine halbe. Deshalb kommt die Datei in Stücken von wenigen MB, jedes
// in einer eigenen Anfrage, die einzeln wiederholt werden kann. Azure kennt das
// als Blockliste eines Block-Blobs; lokal werden die Teile als Dateien abgelegt
// und beim Abschluss zusammengeschrieben.
// ---------------------------------------------------------------------------

const PARTS_DIR = ".parts";

/** Block-Kennung: für ein Blob müssen alle gleich lang und base64 sein. */
function blockId(uploadId: string, index: number): string {
  return Buffer.from(`${uploadId}-${String(index).padStart(6, "0")}`).toString("base64");
}

function partPath(uploadId: string, index: number): string {
  return path.join(LOCAL_DIR, PARTS_DIR, uploadId, String(index).padStart(6, "0"));
}

/** Nimmt ein Teilstück entgegen. Reihenfolge und Vollständigkeit klärt `commitParts`. */
export async function storePart(
  target: string,
  uploadId: string,
  index: number,
  data: Buffer,
): Promise<void> {
  if (isBlobConfigured()) {
    await getContainerClient()
      .getBlockBlobClient(target)
      .stageBlock(blockId(uploadId, index), data, data.length);
    return;
  }
  const full = partPath(uploadId, index);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

/**
 * Setzt die Teile in der angegebenen Reihenfolge zur fertigen Datei zusammen.
 * Fehlt ein Teil, schlägt das fehl — halbe Dateien entstehen hier nicht.
 */
export async function commitParts(
  target: string,
  uploadId: string,
  parts: number,
  contentType: string,
): Promise<StoredFile> {
  const ids = Array.from({ length: parts }, (_, index) => blockId(uploadId, index));
  if (isBlobConfigured()) {
    await getContainerClient()
      .getBlockBlobClient(target)
      .commitBlockList(ids, {
        blobHTTPHeaders: {
          blobContentType: contentType,
          blobCacheControl: "public, max-age=31536000, immutable",
        },
      });
    return { path: target };
  }
  const files = Array.from({ length: parts }, (_, index) => partPath(uploadId, index));
  for (const file of files) await stat(file); // fehlender Teil → Fehler, kein Torso
  const full = path.join(LOCAL_DIR, target);
  await mkdir(path.dirname(full), { recursive: true });
  const sink = createWriteStream(full);
  for (const file of files) await pipeline(createReadStream(file), sink, { end: false });
  await new Promise<void>((resolve, reject) => {
    sink.end((error?: Error | null) => (error ? reject(error) : resolve()));
  });
  await discardParts(uploadId);
  return { path: `uploads/${target}` };
}

/** Verwirft die Zwischenstücke eines Uploads (Abbruch oder nach dem Abschluss). */
export async function discardParts(uploadId: string): Promise<void> {
  if (isBlobConfigured()) {
    // Nicht bestätigte Blöcke räumt Azure selbst ab (nach sieben Tagen);
    // es gibt keine API, sie einzeln zu löschen.
    return;
  }
  try {
    await rm(path.join(LOCAL_DIR, PARTS_DIR, uploadId), { recursive: true, force: true });
  } catch {
    // Aufräumen darf keinen Fehler erzeugen.
  }
}

/** Größe einer abgelegten Datei — die Antwort der Ablage, nicht unsere Annahme. */
export async function mediaSize(name: string): Promise<number | null> {
  const key = storageName(name);
  try {
    if (isBlobConfigured()) {
      const properties = await getContainerClient().getBlockBlobClient(key).getProperties();
      return properties.contentLength ?? null;
    }
    return (await stat(path.join(LOCAL_DIR, key))).size;
  } catch {
    return null;
  }
}

/** Liest einen Ausschnitt — für die Prüfung von Anfang und Ende einer Datei. */
export async function readMediaRange(
  name: string,
  start: number,
  length: number,
): Promise<Buffer | null> {
  const key = storageName(name);
  if (length <= 0) return Buffer.alloc(0);
  try {
    if (isBlobConfigured()) {
      const response = await getContainerClient().getBlockBlobClient(key).download(start, length);
      const body = response.readableStreamBody;
      if (!body) return null;
      const chunks: Buffer[] = [];
      for await (const chunk of body) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks);
    }
    const handle = await open(path.join(LOCAL_DIR, key), "r");
    try {
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, start);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

/** Blob-Name aus einem gespeicherten Pfad (lokal mit `uploads/`-Präfix). */
function storageName(pathOrName: string): string {
  return pathOrName.startsWith("uploads/") ? pathOrName.slice("uploads/".length) : pathOrName;
}

/**
 * Entfernt eine Datei aus der Ablage. Wird nur für angefangene Uploads genutzt,
 * die die Prüfung nicht bestanden haben — gültige Medien werden nicht gelöscht,
 * damit bereits verteilte Links nicht ins Leere zeigen.
 */
export async function deleteMedia(pathOrName: string): Promise<void> {
  const name = storageName(pathOrName);
  try {
    if (isBlobConfigured()) {
      await getContainerClient().getBlockBlobClient(name).deleteIfExists();
      return;
    }
    await unlink(path.join(LOCAL_DIR, name));
  } catch {
    // Nicht vorhanden oder nicht löschbar: der Aufrufer meldet ohnehin den
    // eigentlichen Fehler, ein verwaister Rest darf ihn nicht überdecken.
  }
}

export interface OpenedMedia {
  stream: Readable;
  /** Länge in Bytes, wenn die Ablage sie kennt — sonst null. */
  size: number | null;
}

/**
 * Öffnet ein Medium als Strom für den `/media`-Proxy. Zuvor wurde die Datei
 * vollständig eingelesen und für die Antwort noch einmal kopiert — bei einer
 * 40-MB-Vorlage lagen so 80 MB im Speicher einer Container-App mit 0,5 GiB.
 * Gibt `null` zurück, wenn es die Datei nicht gibt.
 *
 * Der Name darf keine Pfad-Traversal enthalten (wird vom Aufrufer geprüft).
 */
export async function openMedia(name: string): Promise<OpenedMedia | null> {
  if (isBlobConfigured()) {
    try {
      // `maxRetryRequests`: reißt der Strom mitten in einer 40-MB-Datei ab,
      // holt das SDK den Rest nach. Ohne das endet die Antwort still — und die
      // heruntergeladene Datei wäre unbemerkt unvollständig.
      const response = await getContainerClient()
        .getBlockBlobClient(name)
        .download(0, undefined, { maxRetryRequests: 8 });
      const body = response.readableStreamBody;
      if (!body) return null;
      return { stream: body as Readable, size: response.contentLength ?? null };
    } catch {
      return null;
    }
  }
  const full = path.join(LOCAL_DIR, name);
  try {
    const info = await stat(full);
    if (!info.isFile()) return null;
    return { stream: createReadStream(full), size: info.size };
  } catch {
    return null;
  }
}

