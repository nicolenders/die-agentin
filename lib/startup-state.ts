// Zustand des Starts, in einem Wort: sind die Migrationen durchgelaufen?
//
// `instrumentation.ts` versucht `prisma migrate deploy` bis zu achtmal und gibt
// dann auf — die Anwendung bedient danach trotzdem Anfragen, unter Umständen mit
// altem Schema. Bisher stand das nur im Serverprotokoll, und der Status im
// Admin meldete weiter „in Ordnung", weil `SELECT 1` ja funktioniert.
//
// Ein eigener Merker statt einer Datenbankabfrage: die Auskunft muss auch dann
// stimmen, wenn die Datenbank gerade wieder erreichbar ist, die Migration aber
// gescheitert war.

export type MigrationState = "pending" | "applied" | "failed";

// Auf globalThis, nicht als Modulvariable: `instrumentation.ts` und die
// Route Handler landen in getrennten Bündeln, und ein Modul, das zweimal
// geladen wird, hat zweimal seinen eigenen Zustand — der Merker stünde dann
// beim Abfragen immer noch auf „pending". Gleiches Muster wie beim
// Prisma-Singleton in `lib/db.ts`.
const store = globalThis as unknown as {
  __migrationState?: { state: MigrationState; detail: string | null };
};

store.__migrationState ??= { state: "pending", detail: null };

export function setMigrationState(next: MigrationState, message?: string): void {
  store.__migrationState = { state: next, detail: message ?? null };
}

export function migrationState(): MigrationState {
  return store.__migrationState?.state ?? "pending";
}

/** Kurze Ursache des Fehlschlags für das Serverprotokoll — nie für eine Antwort. */
export function migrationDetail(): string | null {
  return store.__migrationState?.detail ?? null;
}
