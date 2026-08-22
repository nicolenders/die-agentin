// Ist die Datenbank wirklich hinter dem Code her?
//
// Bis hierher beantwortete das allein ein Merker im Prozess: Scheiterte der
// Migrationslauf beim Start — etwa weil eine zweite Instanz gerade die Sperre
// hielt und das Zeitbudget verstrich —, blieb die Warnung „Migration prüfen"
// stehen, obwohl die Datenbank längst auf dem neuesten Stand war. Ein Merker im
// Arbeitsspeicher kann das nicht wissen; die Datenbank schon.
//
// Deshalb zwei Quellen: der Merker sagt, ob DIESE Instanz durchkam, und
// `_prisma_migrations` sagt, was tatsächlich angewendet ist. Gewarnt wird nur,
// wenn die Datenbank es bestätigt.

import type { MigrationState } from "@/lib/startup-state";

export interface MigrationRow {
  name: string;
  /** Null, solange Prisma die Migration nicht abschließen konnte. */
  finishedAt: Date | null;
  rolledBackAt: Date | null;
}

export interface MigrationFacts {
  /** Ordnernamen unter prisma/migrations, aufsteigend. */
  expected: string[];
  /** Zeilen aus `_prisma_migrations`. */
  rows: MigrationRow[];
}

export interface MigrationHealth {
  state: MigrationState;
  /** Migrationen ohne (erfolgreichen) Eintrag — die Datenbank ist hinterher. */
  pending: string[];
  /** Angefangen und nie fertig geworden — blockiert jeden weiteren Lauf. */
  broken: string[];
  /** Ein Satz, der sagt, was los ist. Leer, wenn alles stimmt. */
  summary: string;
}

/** Gilt eine Zeile als sauber angewendet? */
function isApplied(row: MigrationRow): boolean {
  return row.finishedAt != null && row.rolledBackAt == null;
}

/**
 * Verbindet den Prozess-Merker mit dem, was in der Datenbank steht.
 *
 * - Fehlt eine Migration oder hängt eine halb angewendet fest → `failed`,
 *   unabhängig davon, was der Merker sagt. Das ist die echte Störung.
 * - Ist die Datenbank vollständig → `applied`, auch wenn DIESE Instanz
 *   aufgegeben hat. Eine andere hat die Arbeit erledigt.
 * - Lassen sich die Fakten nicht lesen (`facts` ist null) → der Merker gilt.
 */
export function resolveMigrationHealth(
  processState: MigrationState,
  facts: MigrationFacts | null,
): MigrationHealth {
  if (!facts) {
    return {
      state: processState,
      pending: [],
      broken: [],
      summary:
        processState === "failed"
          ? "Der Migrationslauf beim Start ist gescheitert, und der Stand der Datenbank ließ sich nicht nachlesen."
          : "",
    };
  }

  const applied = new Set(facts.rows.filter(isApplied).map((r) => r.name));
  const broken = facts.rows.filter((r) => !isApplied(r)).map((r) => r.name);
  const pending = facts.expected.filter((name) => !applied.has(name) && !broken.includes(name));

  if (broken.length > 0) {
    return {
      state: "failed",
      pending,
      broken,
      summary: `Die Migration ${broken[0]} steckt halb angewendet fest und blockiert alle weiteren. Sie muss aufgelöst werden (prisma migrate resolve).`,
    };
  }

  if (pending.length > 0) {
    return {
      state: "failed",
      pending,
      broken,
      summary:
        pending.length === 1
          ? `Die Migration ${pending[0]} ist noch nicht angewendet.`
          : `${pending.length} Migrationen sind noch nicht angewendet, die älteste ist ${pending[0]}.`,
    };
  }

  return { state: "applied", pending: [], broken: [], summary: "" };
}
