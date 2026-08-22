// Material am Briefing: Anleitungen, Notizen, Demo-Dateien, Videos.
//
// Bewusst getrennt von den Foliensätzen (`TalkSlideDeck`): Die Folien sind das
// eine, definierte Ding je Sprache, das ein Einsatz zum Download anbietet.
// Hier liegt alles andere, was zu einem Vortrag gehört und beliebig viel sein
// darf — und was nichts auf der öffentlichen Website zu suchen hat.
//
// Diese Datei ist rein: Endungen, Grenzen, Beschriftungen. Sie wird sowohl im
// Browser (Auswahl, Vorabprüfung) als auch auf dem Server (Annahme) benutzt,
// damit beide Seiten dieselbe Grenze nennen.

export const ATTACHMENT_KINDS = ["GUIDE", "NOTES", "DEMO", "VIDEO", "OTHER"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const ATTACHMENT_KIND_LABEL: Record<AttachmentKind, string> = {
  GUIDE: "Anleitung",
  NOTES: "Notizen",
  DEMO: "Demo-Datei",
  VIDEO: "Video",
  OTHER: "Sonstiges",
};

export function toAttachmentKind(value: string | null | undefined): AttachmentKind {
  return (ATTACHMENT_KINDS as readonly string[]).includes(value ?? "")
    ? (value as AttachmentKind)
    : "OTHER";
}

/**
 * Zugelassene Endungen mit dem Inhaltstyp, unter dem die Datei abgelegt wird.
 *
 * Erlaubt wird über die ENDUNG, nicht über den vom Browser gemeldeten Typ: Der
 * ist frei wählbar und damit keine Prüfung. Was nicht auf dieser Liste steht,
 * kommt nicht herein — das ist die Sperre, nicht ein hübscher Dateidialog.
 *
 * Nicht dabei und mit Absicht: `svg` (kann Skript enthalten) und alles
 * Ausführbare. Für ein Diagramm tut es PNG.
 */
export const ATTACHMENT_TYPES: Record<string, string> = {
  // Dokumente
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  rtf: "application/rtf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  // Bilder
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  // Video und Ton
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  // Demo-Material am Stück
  zip: "application/zip",
};

export const ATTACHMENT_EXTENSIONS = Object.keys(ATTACHMENT_TYPES);

/** Was der Dateidialog anbietet — dieselbe Liste, nur als `accept`. */
export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`).join(",");

// Ein Demo-Video wiegt schnell ein paar hundert MB. Die Datei kommt in
// Teilstücken (siehe lib/media/chunked-upload), im Speicher liegt also nie mehr
// als ein Stück — die Container-App hat 0,5 GiB.
export const MAX_ATTACHMENT_MB = 500;
export const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024;

/** Einheitliche Meldung, damit Formular und API dieselbe Grenze nennen. */
export const ATTACHMENT_TOO_LARGE = `Die Datei ist größer als ${MAX_ATTACHMENT_MB} MB.`;

/** Endung eines Dateinamens, sofern sie zugelassen ist. */
export function attachmentExtension(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ext in ATTACHMENT_TYPES ? ext : null;
}

/** Inhaltstyp aus der Endung; Unbekanntes bekommt den neutralen Typ. */
export function attachmentContentType(fileName: string): string {
  const ext = attachmentExtension(fileName);
  return ext ? ATTACHMENT_TYPES[ext]! : "application/octet-stream";
}

/**
 * Kurzer, sicherer Anzeigename: kein Pfad, keine Sonderzeichen, nicht endlos.
 * Der gespeicherte Blob-Name ist ohnehin eine UUID — dieser Name dient nur der
 * Anzeige und dem Download.
 */
export function safeAttachmentName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^\p{L}\p{N}\-_. ]/gu, "").trim().slice(0, 120);
  return cleaned && cleaned !== `.${attachmentExtension(cleaned) ?? ""}` ? cleaned : "datei";
}

/**
 * Vorgeschlagene Art aus der Endung. Nur ein Vorschlag — wer eine PDF als
 * „Notizen" führen will, tut das; das Feld bleibt änderbar.
 */
export function guessAttachmentKind(fileName: string): AttachmentKind {
  const ext = attachmentExtension(fileName);
  if (!ext) return "OTHER";
  if (["mp4", "m4v", "webm", "mov"].includes(ext)) return "VIDEO";
  if (["txt", "md", "rtf"].includes(ext)) return "NOTES";
  if (["pdf", "docx", "doc", "odt"].includes(ext)) return "GUIDE";
  if (["zip", "csv", "xlsx", "xls", "ods"].includes(ext)) return "DEMO";
  return "OTHER";
}

/** Ob die Datei sich im Browser gefahrlos anzeigen lässt (Vorschau). */
export function isPreviewable(mime: string): boolean {
  return mime.startsWith("image/");
}

/** Größe lesbar: „4,2 MB" bzw. „812 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
