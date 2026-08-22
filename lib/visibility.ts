// Zentrale Sichtbarkeitsregel (Phase 4.1). AN GENAU EINER STELLE definiert,
// nicht pro Seite kopiert:
//
//   öffentlich sichtbar  ⟺  status = PUBLISHED  UND  publishedAt <= now
//
// SCHEDULED und PUBLISHED mit Zukunftsdatum erscheinen NICHT öffentlich.
// ARCHIVED erscheint nicht, bleibt aber erhalten. Gilt einheitlich für Dispatch,
// Mission-Detailseiten, Briefing usw. sowie für Sitemap und RSS.

export type ContentStatusValue = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

/** Ist ein Eintrag mit diesem Status/Datum öffentlich sichtbar? */
export function isPublic(
  status: string,
  publishedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  return status === "PUBLISHED" && publishedAt != null && publishedAt.getTime() <= now.getTime();
}

/** Prisma-`where`-Fragment für „öffentlich sichtbar" (auf `publishedAt`-Feldern). */
export function publishedWhere(now: Date = new Date()) {
  return { status: "PUBLISHED", publishedAt: { lte: now } } as const;
}
