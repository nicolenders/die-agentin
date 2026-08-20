// Wiederholstrategie für den Migrationslauf beim Start.
//
// Ausgelagert und rein gehalten, weil genau hier der Fehler saß: Acht Versuche
// mit je 5 s Pause ergeben rund 40 s Wartezeit. Eine pausierte Azure-SQL-
// Instanz im serverlosen Tarif braucht 30–60 s zum Aufwachen — das Budget lag
// also ungefähr auf der Grenze und darunter, sobald die Datenbank etwas länger
// brauchte. Schlimmer noch: Danach wurde nie wieder versucht. Ein einmaliger
// Startbefund wurde damit zu einem dauerhaften Urteil, obwohl die Datenbank
// zwanzig Sekunden später bereitstand.
//
// Die Zahlen hier sind der eigentliche Inhalt der Korrektur, deshalb stehen sie
// an einer Stelle und sind geprüft.

/** Erste Pause zwischen zwei Versuchen. */
export const INITIAL_DELAY_MS = 2_000;

/** Obergrenze der Pause. Länger zu warten hilft nicht mehr, kostet nur Zeit. */
export const MAX_DELAY_MS = 30_000;

/**
 * Gesamtbudget. Großzügig, weil Aufgeben teurer ist als Weiterversuchen: Der
 * Prozess läuft ohnehin, und ein Versuch alle 30 s belastet nichts. 15 Minuten
 * decken auch eine Datenbank ab, die ungewöhnlich lange braucht oder erst nach
 * einem Wartungsfenster zurückkommt.
 */
export const TOTAL_BUDGET_MS = 15 * 60 * 1_000;

/**
 * So lange hält `register()` den Serverstart auf. Danach läuft der Versuch im
 * Hintergrund weiter.
 *
 * Warum überhaupt warten: Ist die Datenbank warm — der Normalfall bei einem
 * Deploy in den laufenden Betrieb —, ist die Migration in ein bis drei Sekunden
 * durch, und dann soll sie vor der ersten Anfrage fertig sein.
 *
 * Warum nicht länger: Next wartet auf `register()`, bevor es Anfragen annimmt.
 * Ein Start, der Minuten braucht, läuft in die Startprüfung von Azure Container
 * Apps — der Container wird abgeschossen und neu gestartet, und das Ganze
 * beginnt von vorn. Eine blockierte Bereitschaft ist ein schlimmerer Fehler als
 * eine Migration, die etwas später greift.
 */
export const STARTUP_GRACE_MS = 15_000;

/**
 * Pause vor dem nächsten Versuch: verdoppelt sich, gedeckelt.
 * 2 s, 4 s, 8 s, 16 s, dann 30 s.
 *
 * Warum ansteigend: Die ersten Fehlschläge kommen meist sofort (Verbindung
 * abgelehnt, während die Instanz hochfährt). Dort schnell nachzufassen ist
 * billig. Hält es länger an, ist häufiges Nachfragen sinnlos — dann wartet man
 * besser in Ruhe.
 */
export function backoffDelay(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(MAX_DELAY_MS, INITIAL_DELAY_MS * 2 ** exponent);
}

/** Ist das Budget noch nicht aufgebraucht? */
export function shouldKeepTrying(elapsedMs: number, budgetMs: number = TOTAL_BUDGET_MS): boolean {
  return elapsedMs < budgetMs;
}

/**
 * Fehler, die daher kommen, dass eine ANDERE Instanz gerade migriert.
 *
 * Bei mehreren Replicas startet jede ihren eigenen Lauf. Prisma serialisiert das
 * über eine Sperre; wer sie nicht bekommt, bricht ab. Das ist kein Schaden — die
 * andere Instanz erledigt die Arbeit —, sieht aber wie ein Fehlschlag aus.
 * Erkannt wird es, damit das Protokoll nicht nach einem Problem klingt, wo
 * keines ist.
 */
export function isLockContention(message: string): boolean {
  return /advisory lock|applock|lock timeout|could not acquire|already in progress/i.test(message);
}

/**
 * Bezeichnung eines Versuchs fürs Protokoll. Ohne verstrichene Zeit ist bei
 * einem Lauf über Minuten nicht erkennbar, ob er noch sinnvoll arbeitet.
 */
export function attemptLabel(attempt: number, elapsedMs: number): string {
  return `Versuch ${attempt}, ${Math.round(elapsedMs / 1000)} s seit Start`;
}
