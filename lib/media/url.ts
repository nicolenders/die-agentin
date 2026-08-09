// Baut die URL zu einem gespeicherten Medium. Bilder werden nicht direkt vom
// Blob-Storage geladen, sondern über den App-eigenen Proxy `/media/…` (siehe
// app/media/[...path]/route.ts). Das funktioniert unabhängig davon, ob der
// Storage-Account öffentlichen Blob-Zugriff erlaubt (im Enterprise-Tenant oft
// per Policy gesperrt), hält die CSP auf `self` und liefert stabile,
// cachebare Same-Origin-URLs.
export function assetUrl(blobPath: string): string {
  // Bereits absolute URL oder absoluter App-Pfad: unverändert lassen.
  if (/^https?:\/\//i.test(blobPath) || blobPath.startsWith("/")) {
    return blobPath;
  }
  // Lokaler Entwicklungs-Pfad (public/uploads/…) wird direkt ausgeliefert.
  if (blobPath.startsWith("uploads/")) {
    return `/${blobPath}`;
  }
  // Blob-Name → über den App-Proxy streamen.
  return `/media/${blobPath}`;
}
