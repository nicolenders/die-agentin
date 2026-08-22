import "server-only";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/lib/db";
import type { MigrationFacts, MigrationRow } from "@/lib/startup/migration-health";

// Der tatsächliche Migrationsstand: welche Ordner es gibt und was davon in
// `_prisma_migrations` steht. Beides ist im Laufzeit-Image vorhanden — das
// Dockerfile kopiert `prisma/` mit.

/** Ordnernamen unter prisma/migrations, aufsteigend (Zeitstempel-Präfix). */
export function expectedMigrations(root: string = process.cwd()): string[] {
  try {
    return readdirSync(join(root, "prisma", "migrations"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Liest die Buchführung von Prisma. Rohabfrage, weil die Tabelle nicht im
 * Schema steht — sie gehört Prisma, nicht der Anwendung.
 */
async function appliedMigrations(): Promise<MigrationRow[]> {
  const rows = await db.$queryRaw<
    { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]
  >`SELECT [migration_name], [finished_at], [rolled_back_at] FROM [dbo].[_prisma_migrations]`;
  return rows.map((r) => ({
    name: r.migration_name,
    finishedAt: r.finished_at,
    rolledBackAt: r.rolled_back_at,
  }));
}

/**
 * Fakten für die Statusauskunft. `null`, wenn sich der Stand nicht lesen lässt
 * — dann entscheidet der Merker aus dem Startlauf, statt zu raten.
 */
export async function getMigrationFacts(): Promise<MigrationFacts | null> {
  const expected = expectedMigrations();
  if (expected.length === 0) return null;
  try {
    return { expected, rows: await appliedMigrations() };
  } catch {
    return null;
  }
}
