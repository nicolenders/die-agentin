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
  /**
   * Migrationen ohne Eintrag, deren Tabellen aber schon in der Datenbank
   * stehen. Fehlt die Angabe (`undefined`), wurde nicht nachgesehen.
   */
  alreadyInPlace?: string[];
}

export interface MigrationHealth {
  state: MigrationState;
  /** Migrationen ohne Eintrag, deren Objekte auch wirklich fehlen. */
  pending: string[];
  /**
   * Migrationen ohne Eintrag, die faktisch längst wirken — von Hand
   * ausgeführt, aber nie verbucht. Sie sind der eigentliche Stolperstein: Beim
   * Start versucht Prisma sie erneut, scheitert an schon vorhandenen Objekten
   * und lässt alles Nachfolgende liegen.
   */
  unrecorded: string[];
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
      unrecorded: [],
      broken: [],
      summary:
        processState === "failed"
          ? "Der Migrationslauf beim Start ist gescheitert, und der Stand der Datenbank ließ sich nicht nachlesen."
          : "",
    };
  }

  const applied = new Set(facts.rows.filter(isApplied).map((r) => r.name));
  // Zu einer Migration können MEHRERE Zeilen stehen. Genau das passiert nach
  // einer Rettung von Hand: `migrate resolve --rolled-back` setzt in der alten
  // Zeile `rolled_back_at`, der nächste Lauf legt eine neue Zeile an und bringt
  // sie sauber durch. Die alte Zeile ist danach Geschichte, kein Befund.
  //
  // Ohne diese Unterscheidung meldete die Zentrale genau in diesem Fall dauerhaft
  // „Migration prüfen“ — für eine Migration, die längst angewendet war und über
  // die sich nichts mehr tun ließ. Blockierend ist eine Migration nur, wenn es zu
  // ihr KEINE erfolgreiche Zeile gibt.
  const broken = [...new Set(facts.rows.filter((r) => !isApplied(r)).map((r) => r.name))].filter(
    (name) => !applied.has(name),
  );
  const pending = facts.expected.filter((name) => !applied.has(name) && !broken.includes(name));

  const known = new Set(facts.alreadyInPlace ?? []);
  const unrecorded = pending.filter((name) => known.has(name));
  const missing = pending.filter((name) => !known.has(name));

  if (broken.length > 0) {
    return {
      state: "failed",
      pending: missing,
      unrecorded,
      broken,
      summary: `Die Migration ${broken[0]} steckt halb angewendet fest und blockiert alle weiteren. Sie muss aufgelöst werden (prisma migrate resolve).`,
    };
  }

  // Der Fall, an dem sich alles verhakt: Die Objekte sind da, nur der Eintrag
  // fehlt. Er wird zuerst genannt, weil er die übrigen blockiert — solange er
  // besteht, kommt kein Startlauf an ihm vorbei.
  if (unrecorded.length > 0) {
    const rest = missing.length;
    return {
      state: "failed",
      pending: missing,
      unrecorded,
      broken,
      summary:
        `${unrecorded.length === 1 ? "Die Migration" : `${unrecorded.length} Migrationen`} ` +
        `${unrecorded.length === 1 ? unrecorded[0] + " wirkt" : "wirken"} bereits in der Datenbank, ` +
        `${unrecorded.length === 1 ? "ist" : "sind"} aber nicht eingetragen. ` +
        "Beim Start versucht Prisma sie erneut, " +
        `scheitert an den vorhandenen Tabellen und bricht ab` +
        (rest > 0
          ? ` — deshalb ${rest === 1 ? "bleibt eine weitere Migration" : `bleiben ${rest} weitere Migrationen`} liegen.`
          : ".") +
        " Nachtragen statt erneut ausführen.",
    };
  }

  if (missing.length > 0) {
    return {
      state: "failed",
      pending: missing,
      unrecorded,
      broken,
      summary:
        missing.length === 1
          ? `Die Migration ${missing[0]} ist noch nicht angewendet.`
          : `${missing.length} Migrationen sind noch nicht angewendet, die älteste ist ${missing[0]}.`,
    };
  }

  return { state: "applied", pending: [], unrecorded: [], broken: [], summary: "" };
}
