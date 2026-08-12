// App-seitige „Enums". Der sqlserver-Connector unterstützt keine nativen
// Prisma-Enums (siehe docs/decisions/0004-sqlserver-enums.md), daher sind die
// entsprechenden Spalten Strings. Diese Datei ist die einzige Quelle der
// zulässigen Werte und wird beim Schreiben (Server Actions, Seed) zur
// Validierung genutzt.

export const POST_TYPES = ["SIGNAL", "NOTE", "BACKSTAGE"] as const;
export type PostType = (typeof POST_TYPES)[number];

export const CONTENT_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const TRANS_STATES = ["MISSING", "AI_DRAFT", "REVIEWED"] as const;
export type TransState = (typeof TRANS_STATES)[number];

export const MISSION_STATUSES = ["PLANNED", "DONE", "CANCELLED"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const PLATFORMS = [
  "LINKEDIN",
  "X",
  "INSTAGRAM",
  "FACEBOOK",
  "YOUTUBE",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const TASK_STATES = [
  "PENDING",
  "SENT",
  "FAILED",
  "MANUAL_OPEN",
  "MANUAL_DONE",
  "SKIPPED",
] as const;
export type TaskState = (typeof TASK_STATES)[number];

export const TAXONOMY_KINDS = ["DOSSIER", "TALK", "CERTIFICATION"] as const;
export type TaxonomyKind = (typeof TAXONOMY_KINDS)[number];

export const PUBLICATION_TYPES = ["BOOK", "COURSE", "REPOSITORY", "ARTICLE", "PODCAST", "INTERVIEW", "WHITEPAPER"] as const;
export type PublicationType = (typeof PUBLICATION_TYPES)[number];

// Depeschen-Format (Phase 3): NOTE kurze Meldung · ANALYSIS Einordnung ·
// REFERENCE gepflegtes Nachschlagewerk (sichtbares Änderungsdatum) ·
// BACKSTAGE Persönliches.
export const DISPATCH_FORMATS = ["NOTE", "ANALYSIS", "REFERENCE", "BACKSTAGE"] as const;
export type DispatchFormat = (typeof DISPATCH_FORMATS)[number];

// Zertifizierungs-Status (Phase 5.3): PLANNED = „In Ausbildung".
export const CERTIFICATION_STATUSES = ["PLANNED", "ACHIEVED", "EXPIRED"] as const;
export type CertificationStatus = (typeof CERTIFICATION_STATUSES)[number];

// Art des Auftritts (Phase 9.1).
export const SESSION_TYPES = ["KEYNOTE", "SESSION", "WORKSHOP", "PANEL"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

/** Generischer Prüfer: Ist `value` einer der erlaubten Werte? */
export function isOneOf<T extends readonly string[]>(
  allowed: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}
