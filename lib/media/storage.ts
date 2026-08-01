import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Medienablage. Lokal: Dateien unter public/uploads/ (im Dev von Next
// ausgeliefert). Produktiv: Azure Blob Storage, Container `media` — das
// erfordert das SDK @azure/storage-blob und ist als offener Punkt markiert
// (siehe docs/decisions/0005-media-storage.md).

export interface StoredFile {
  /** Relativer Pfad, wie in MediaAsset.blobPath / variants gespeichert. */
  path: string;
}

const LOCAL_DIR = path.join(process.cwd(), "public", "uploads");

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_ACCOUNT_NAME);
}

/**
 * Speichert einen Datei-Buffer. Gibt den relativen Pfad zurück, der in der DB
 * abgelegt wird (`assetUrl` baut daraus die öffentliche URL).
 */
export async function storeFile(
  relativePath: string,
  buffer: Buffer,
): Promise<StoredFile> {
  if (isBlobConfigured()) {
    // Produktiv-Pfad: Upload nach Azure Blob (media-Container). Benötigt
    // @azure/storage-blob + Managed Identity. Bis dahin bewusst nicht
    // implementiert, statt ein halbes Verhalten vorzutäuschen.
    throw new Error(
      "Blob-Upload ist noch nicht implementiert (siehe docs/decisions/0005-media-storage.md). " +
        "Lokal ohne BLOB_ACCOUNT_NAME funktioniert der Upload.",
    );
  }
  const full = path.join(LOCAL_DIR, relativePath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer);
  return { path: `uploads/${relativePath}` };
}
