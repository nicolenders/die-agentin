// Bildtyp-Erkennung über Magic Bytes statt Dateiendung (SPEC §13).
// Nur diese Typen sind als Upload erlaubt: jpeg, png, webp, avif.

export type DetectedMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/avif";

export const ALLOWED_UPLOAD_MIME: DetectedMime[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB (SPEC §13)

function bytesMatch(buf: Uint8Array, offset: number, sig: number[]): boolean {
  if (buf.length < offset + sig.length) return false;
  return sig.every((b, i) => buf[offset + i] === b);
}

/** Erkennt den echten Bildtyp aus den ersten Bytes. Null, wenn nicht erlaubt. */
export function detectImageMime(buf: Uint8Array): DetectedMime | null {
  // JPEG: FF D8 FF
  if (bytesMatch(buf, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytesMatch(buf, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  // WEBP: "RIFF"...."WEBP"
  if (bytesMatch(buf, 0, [0x52, 0x49, 0x46, 0x46]) && bytesMatch(buf, 8, [0x57, 0x45, 0x42, 0x50])) {
    return "image/webp";
  }
  // AVIF: ....'ftyp' with 'avif'/'avis' brand
  if (
    bytesMatch(buf, 4, [0x66, 0x74, 0x79, 0x70]) &&
    (bytesMatch(buf, 8, [0x61, 0x76, 0x69, 0x66]) ||
      bytesMatch(buf, 8, [0x61, 0x76, 0x69, 0x73]))
  ) {
    return "image/avif";
  }
  return null;
}

export interface UploadValidation {
  ok: boolean;
  mime?: DetectedMime;
  error?: string;
}

/** Prüft Größe und echten Typ eines Uploads. */
export function validateUpload(buf: Uint8Array): UploadValidation {
  if (buf.length === 0) return { ok: false, error: "Die Datei ist leer." };
  if (buf.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Die Datei ist größer als 20 MB." };
  }
  const mime = detectImageMime(buf);
  if (!mime) {
    return {
      ok: false,
      error: "Nur JPEG, PNG, WebP oder AVIF sind erlaubt.",
    };
  }
  return { ok: true, mime };
}
