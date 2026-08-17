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

/**
 * `Content-Disposition` für einen Download mit sprechendem Dateinamen. Der
 * gespeicherte Name ist eine UUID; ohne diesen Header landet eine Foliensvorlage
 * als „a3f1….pptx" im Download-Ordner.
 *
 * Zwei Formen, wie in RFC 6266 vorgesehen: ein ASCII-Fallback für alte Browser
 * und `filename*` mit UTF-8 für Umlaute. Steuerzeichen und Anführungszeichen
 * werden entfernt — sonst ließe sich der Header aufbrechen.
 */
export function contentDisposition(fileName: string): string {
  const clean = fileName.replace(/[\r\n]/g, "").slice(0, 120).trim();
  const ascii = clean.replace(/[^\x20-\x7e]/g, "_").replace(/["\\;]/g, "") || "download";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean || "download")}`;
}
