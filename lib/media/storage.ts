import { mkdir, writeFile, readFile } from "node:fs/promises";
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
 * Liest ein Medium für den `/media`-Proxy: aus dem Blob-Container (per Managed
 * Identity) bzw. lokal aus public/uploads. Gibt `null` zurück, wenn es nicht
 * existiert. Der Name darf keine Pfad-Traversal enthalten (wird vom Aufrufer
 * geprüft).
 */
export async function readMedia(name: string): Promise<Buffer | null> {
  if (isBlobConfigured()) {
    try {
      return await getContainerClient().getBlockBlobClient(name).downloadToBuffer();
    } catch {
      return null;
    }
  }
  try {
    return await readFile(path.join(LOCAL_DIR, name));
  } catch {
    return null;
  }
}
