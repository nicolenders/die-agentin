// Zustand des Starts: sind die Migrationen durchgelaufen?
//
// Drei Werte, und die Bedeutung von `pending` ist der Kern:
//
//   pending  Noch nicht durch — entweder läuft der erste Versuch, oder ein
//            Versuch ist gescheitert und der nächste steht an.
//   applied  Durch.
//   failed   AUFGEGEBEN. Das Zeitbudget ist aufgebraucht, es kommt kein
//            weiterer Versuch mehr.
//
// Dass ein gescheiterter Versuch `pending` bleibt und nicht sofort `failed`
// wird, ist Absicht: Beim Kaltstart einer pausierten Datenbank sind die ersten
// Fehlschläge der Normalfall, kein Befund. Erst wenn wirklich niemand mehr
// nachfasst, ist das eine Meldung wert — und genau dann zeigt die Zentrale ihre
// Warnung. Vorher blinkte sie bei jedem gewöhnlichen Kaltstart auf.
//
// Ein eigener Merker statt einer Datenbankabfrage: die Auskunft muss auch dann
// stimmen, wenn die Datenbank gerade wieder erreichbar ist, die Migration aber
// nie durchlief.

export type MigrationState = "pending" | "applied" | "failed";

export interface MigrationInfo {
  state: MigrationState;
  /** Zahl der bisherigen Versuche. */
  attempts: number;
  /** Steht noch ein Versuch aus? */
  retrying: boolean;
  /** Kurze Ursache des letzten Fehlschlags — fürs Protokoll, nie für eine Antwort. */
  detail: string | null;
}

// Auf globalThis, nicht als Modulvariable: `instrumentation.ts` und die
// Route Handler landen in getrennten Bündeln, und ein Modul, das zweimal
// geladen wird, hat zweimal seinen eigenen Zustand — der Merker stünde dann
// beim Abfragen immer noch auf „pending". Gleiches Muster wie beim
// Prisma-Singleton in `lib/db.ts`.
const store = globalThis as unknown as {
  __migrationState?: MigrationInfo;
};

store.__migrationState ??= { state: "pending", attempts: 0, retrying: false, detail: null };

function current(): MigrationInfo {
  return store.__migrationState ?? { state: "pending", attempts: 0, retrying: false, detail: null };
}

export function setMigrationState(next: MigrationState, message?: string): void {
  store.__migrationState = {
    ...current(),
    state: next,
    // Wer „applied" oder „failed" meldet, ist fertig — so oder so.
    retrying: false,
    detail: message ?? null,
  };
}

/**
 * Ein Versuch ist gescheitert, der nächste kommt. Der Zustand bleibt `pending`:
 * Es ist noch nichts entschieden.
 */
export function noteMigrationAttempt(attempt: number, message: string): void {
  store.__migrationState = {
    state: "pending",
    attempts: attempt,
    retrying: true,
    detail: message,
  };
}

export function migrationState(): MigrationState {
  return current().state;
}

/** Kurze Ursache des Fehlschlags für das Serverprotokoll — nie für eine Antwort. */
export function migrationDetail(): string | null {
  return current().detail;
}

/** Vollständige Auskunft für Diagnosezwecke. */
export function migrationInfo(): MigrationInfo {
  return { ...current() };
}
