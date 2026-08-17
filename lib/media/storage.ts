import { mkdir, writeFile, stat, unlink } from "node:fs/promises";
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

/**
 * Wie `storeFile`, aber ohne die Datei je vollständig im Speicher zu halten:
 * der Strom wird direkt in den Blob bzw. auf die Platte geschrieben. Für große
 * Uploads (Foliensvorlagen) die einzige Variante, die in einer Container-App
 * mit 0,5 GiB verlässlich durchläuft.
 *
 * Bricht der Strom ab (z. B. weil die Obergrenze überschritten wurde), wirft
 * diese Funktion — der Aufrufer räumt die angefangene Datei mit `deleteMedia`
 * wieder weg.
 */
export async function storeStream(
  relativePath: string,
  stream: Readable,
  contentType: string,
): Promise<StoredFile> {
  if (isBlobConfigured()) {
    const blob = getContainerClient().getBlockBlobClient(relativePath);
    // 4-MB-Blöcke, zwei parallel: der Speicherbedarf bleibt bei ~8 MB,
    // unabhängig davon, wie groß die Datei ist.
    await blob.uploadStream(stream, 4 * 1024 * 1024, 2, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobCacheControl: "public, max-age=31536000, immutable",
      },
    });
    return { path: relativePath };
  }
  const full = path.join(LOCAL_DIR, relativePath);
  await mkdir(path.dirname(full), { recursive: true });
  await pipeline(stream, createWriteStream(full));
  return { path: `uploads/${relativePath}` };
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
      const response = await getContainerClient().getBlockBlobClient(name).download();
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

