// Autorisierung über eine Allow-List von Entra Object IDs (SPEC §9).
// Genau ein Admin, keine User-Tabelle, keine Registrierung. Ist die Object ID
// nicht enthalten, gilt der Nutzer als nicht autorisiert (→ 403).

/** Zerlegt `ADMIN_OBJECT_IDS` (kommasepariert) in eine bereinigte Liste. */
export function parseAdminObjectIds(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/** Ist die gegebene Object ID in der Allow-List? Vergleich case-insensitive. */
export function isAdminObjectId(
  oid: string | undefined | null,
  allowList: string[],
): boolean {
  if (!oid) return false;
  const needle = oid.toLowerCase();
  return allowList.some((id) => id.toLowerCase() === needle);
}

/** Bequemer Kombinierer für den Laufzeit-Check gegen die Umgebung. */
export function isAdmin(oid: string | undefined | null): boolean {
  return isAdminObjectId(oid, parseAdminObjectIds(process.env.ADMIN_OBJECT_IDS));
}
