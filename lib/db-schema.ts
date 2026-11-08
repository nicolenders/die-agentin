import { Prisma } from "@prisma/client";

// Erkennt, dass eine Abfrage an einem Schema scheitert, das die Datenbank noch
// nicht hat: Tabelle oder Spalte fehlt, weil die Migration beim Start nicht
// durchgelaufen ist.
//
// Gebraucht wird das für die Lesewege, die neue Tabellen im selben Deploy
// mitlesen, in dem die Tabellen erst entstehen. Ohne Unterscheidung bleibt nur
// „alles oder nichts" — und genau das hat die öffentliche Einsatzliste nach dem
// Deploy vom 20.10.2026 leer gemacht (ADR 0035).

/** Prisma-Codes für „Tabelle existiert nicht" und „Spalte existiert nicht". */
const MISSING_SCHEMA_CODES = new Set(["P2021", "P2022"]);

/**
 * SQL-Server-Meldungen, falls Prisma den Fehler nicht als bekannten Code
 * meldet (z. B. als P2010 aus einer Rohabfrage oder als unbekannter Fehler).
 * 208: Invalid object name, 207: Invalid column name.
 */
const MISSING_SCHEMA_MESSAGES = [/invalid object name/i, /invalid column name/i];

export function isMissingSchemaError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && MISSING_SCHEMA_CODES.has(error.code)) {
    return true;
  }
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return MISSING_SCHEMA_MESSAGES.some((pattern) => pattern.test(message));
}
