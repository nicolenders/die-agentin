import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/lib/db";
import type { MigrationFacts, MigrationRow } from "@/lib/startup/migration-health";
import { createdTables } from "@/lib/startup/migration-objects";

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
 * Welche der genannten Migrationen wirken bereits, obwohl sie nicht eingetragen
 * sind? Gefragt wird die Datenbank selbst: Steht die Tabelle da, die die
 * Migration anlegen würde, dann ist sie faktisch angewendet.
 *
 * Das ist die Unterscheidung zwischen „muss noch laufen" und „läuft nie wieder
 * durch, weil es die Tabelle schon gibt". Ohne sie sieht beides gleich aus, und
 * die zweite Lage löst sich von selbst nie auf.
 */
async function alreadyInPlace(names: string[], root: string = process.cwd()): Promise<string[]> {
  const done: string[] = [];
  for (const name of names) {
    let tables: string[];
    try {
      tables = createdTables(readFileSync(join(root, "prisma", "migrations", name, "migration.sql"), "utf8"));
    } catch {
      continue;
    }
    // Legt die Migration keine Tabelle an, lässt sich von außen nichts sagen —
    // dann lieber nichts behaupten.
    if (tables.length === 0) continue;
    try {
      const present = await Promise.all(
        tables.map(async (table) => {
          const [row] = await db.$queryRaw<{ id: number | null }[]>`
            SELECT OBJECT_ID('dbo.' + ${table}) AS id
          `;
          return row?.id != null;
        }),
      );
      if (present.every(Boolean)) done.push(name);
    } catch {
      // Lässt sich der Stand nicht erfragen, gilt die Migration als offen.
    }
  }
  return done;
}

/**
 * Fakten für die Statusauskunft. `null`, wenn sich der Stand nicht lesen lässt
 * — dann entscheidet der Merker aus dem Startlauf, statt zu raten.
 */
export async function getMigrationFacts(): Promise<MigrationFacts | null> {
  const expected = expectedMigrations();
  if (expected.length === 0) return null;
  try {
    const rows = await appliedMigrations();
    const recorded = new Set(rows.filter((r) => r.finishedAt != null && r.rolledBackAt == null).map((r) => r.name));
    const open = expected.filter((name) => !recorded.has(name));
    // Nur für die offenen nachsehen — im Normalfall ist die Liste leer und es
    // entsteht keine einzige zusätzliche Abfrage.
    return { expected, rows, alreadyInPlace: open.length > 0 ? await alreadyInPlace(open) : [] };
  } catch {
    return null;
  }
}
