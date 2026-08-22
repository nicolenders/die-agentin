// Auswertung der Antwort von `/api/health/db` für die Zentrale.
//
// Ausgelagert, weil genau hier der Fehler saß: Die Anzeige leitete „Datenbank
// wird geweckt" aus jeder nicht-ok-Antwort ab, und die Route antwortete auch
// dann nicht-ok, wenn die Datenbank einwandfrei lief, aber der Migrationslauf
// beim Start gescheitert war. Ergebnis: ein Overlay, das die Bearbeitung sperrte,
// über einer Oberfläche, die nachweislich funktionierte.
//
// Zwei Lagen, zwei Fragen — und beide sind hier prüfbar, ohne einen Browser.

export type Migrations = "pending" | "applied" | "failed";

export interface HealthResponse {
  ok?: boolean;
  migrations?: Migrations;
  /** Ein Satz, der sagt, WAS mit den Migrationen nicht stimmt. */
  migrationDetail?: string;
}

export interface AdminDbState {
  /** Sperrt die Oberfläche. Nur bei nicht erreichbarer Datenbank. */
  blocking: boolean;
  /** Ruhige Warnung in der Kopfzeile, ohne Sperre. */
  warnMigrations: boolean;
  migrations: Migrations;
  /**
   * Grund der Warnung, in einem Satz. Eine Warnung ohne Grund lässt sich nicht
   * abstellen — man sieht sie und weiß nicht, wo man anfangen soll.
   */
  migrationDetail: string;
}

/**
 * Leitet den Zustand der Zentrale aus HTTP-Status und Antwortkörper ab.
 * `httpOk` ist `Response.ok` — die Erreichbarkeit der Datenbank.
 */
export function adminDbState(httpOk: boolean, body: HealthResponse | null): AdminDbState {
  const migrations = body?.migrations ?? "pending";
  return {
    blocking: !httpOk,
    // Eine gescheiterte Migration meldet nur, wer überhaupt antworten kann.
    warnMigrations: httpOk && migrations === "failed",
    migrations,
    migrationDetail: body?.migrationDetail ?? "",
  };
}
