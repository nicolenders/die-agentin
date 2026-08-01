// Baut die öffentliche URL zu einem Blob-Pfad. Produktiv liegt das Medium im
// Storage-Account (Container `media`, öffentlich lesend, SPEC §14). Ist bereits
// eine absolute URL oder ein lokaler Pfad gespeichert, wird er unverändert
// zurückgegeben.
export function assetUrl(blobPath: string): string {
  if (/^https?:\/\//i.test(blobPath) || blobPath.startsWith("/")) {
    return blobPath;
  }
  const account = process.env.BLOB_ACCOUNT_NAME;
  const container = process.env.BLOB_CONTAINER_MEDIA ?? "media";
  if (!account) return `/${blobPath}`;
  return `https://${account}.blob.core.windows.net/${container}/${blobPath}`;
}
