// Wendet ausstehende Prisma-Migrationen beim Serverstart an — im Node-Prozess,
// nicht über den Container-Startbefehl. Grund: Azure Container Apps kann den
// Docker-CMD überschreiben, sodass ein Startskript (scripts/start.sh) nicht
// zwingend läuft. `register()` wird von Next.js beim Booten jeder Server-Instanz
// aufgerufen und ist damit unabhängig davon. `migrate deploy` ist idempotent.
//
// Was hier vorher schieflief, in zwei Punkten:
//
// 1. Das Budget war zu knapp. Acht Versuche à 5 s Pause sind rund 40 s; eine
//    pausierte Azure-SQL-Instanz braucht 30–60 s zum Aufwachen. Der Lauf endete
//    also regelmäßig kurz vor dem Ziel.
//
// 2. Aufgeben war endgültig. Nach dem achten Versuch kam keiner mehr — auch
//    dann nicht, wenn die Datenbank zwanzig Sekunden später bereitstand. Ein
//    einmaliger Startbefund wurde zum dauerhaften Urteil, und die Anwendung
//    lief bis zum nächsten Neustart womöglich gegen ein altes Schema.
//
// Deshalb jetzt: ansteigende Pausen und ein Budget, das den Kaltstart wirklich
// abdeckt (`lib/startup/migrate-policy.ts`), und der Lauf hängt nicht mehr am
// Rückgabewert von `register()`.

const CLI = "node_modules/prisma/build/index.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Eine Zeile je Versuch. Prisma-Meldungen sind mehrzeilig und beginnen mit
 * Zeilenumbrüchen — ungekürzt sieht im Protokoll jeder Versuch aus wie ein
 * Fehler ohne Grund, und die eigentliche Ursache steht vier Zeilen tiefer.
 */
function oneLine(message: string, max = 200): string {
  const flat = message.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * Wartet, bis die Datenbank antwortet — und weckt sie damit zugleich.
 *
 * Billiger als der bisherige Weg: Vorher wurde für jeden Versuch die Prisma-CLI
 * als eigener Node-Prozess gestartet, nur um festzustellen, dass die Instanz
 * noch hochfährt. `SELECT 1` über den vorhandenen Client kostet fast nichts und
 * wärmt nebenbei den Verbindungspool, den die Anwendung ohnehin braucht.
 */
async function waitForDatabase(): Promise<void> {
  const { db } = await import("./lib/db");
  await db.$queryRaw`SELECT 1`;
}

/** `migrate deploy` einmal ausführen. Wirft mit lesbarer Ursache. */
async function runDeploy(): Promise<string> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { existsSync } = await import("node:fs");

  // Fehlt die CLI, hilft kein Wiederholen — dann ist das Image falsch gebaut.
  // Ohne diese Prüfung liefe die Schleife das volle Budget lang gegen eine
  // Ursache, die sich nie ändert.
  if (!existsSync(CLI)) {
    throw new Error(
      `Prisma-CLI nicht gefunden (${CLI}). Das Image enthält sie nicht — siehe Dockerfile.`,
    );
  }

  const run = promisify(execFile);
  const { stdout } = await run(process.execPath, [CLI, "migrate", "deploy"]);
  return stdout;
}

/**
 * Der eigentliche Lauf. Läuft weiter, auch wenn `register()` längst
 * zurückgekehrt ist.
 */
async function applyMigrations(): Promise<void> {
  const { setMigrationState, noteMigrationAttempt } = await import("./lib/startup-state");
  const { backoffDelay, shouldKeepTrying, isLockContention, attemptLabel } = await import(
    "./lib/startup/migrate-policy"
  );

  const startedAt = Date.now();

  for (let attempt = 1; ; attempt++) {
    const elapsed = () => Date.now() - startedAt;
    try {
      await waitForDatabase();
      const stdout = await runDeploy();
      console.log(`[startup-migrate] Migrationen angewendet (${attemptLabel(attempt, elapsed())}).\n${stdout}`);
      setMigrationState("applied");
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Eine andere Instanz migriert gerade. Kein Schaden — sie erledigt es.
      // Trotzdem weiter nachsehen, bis der Lauf durch ist.
      if (isLockContention(message)) {
        console.log(
          `[startup-migrate] Eine andere Instanz migriert gerade (${attemptLabel(attempt, elapsed())}). Warte ab.`,
        );
      } else {
        console.warn(
          `[startup-migrate] ${attemptLabel(attempt, elapsed())} fehlgeschlagen (Datenbank fährt womöglich hoch): ${oneLine(message)}`,
        );
      }

      if (!shouldKeepTrying(elapsed())) {
        console.error(
          `[startup-migrate] Nach ${Math.round(elapsed() / 1000)} s aufgegeben. ` +
            `Die Anwendung läuft weiter, arbeitet aber womöglich gegen ein altes Schema. ` +
            `Letzte Ursache: ${message}`,
        );
        setMigrationState("failed", message);
        return;
      }

      noteMigrationAttempt(attempt, message);
      await sleep(backoffDelay(attempt));
    }
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { setMigrationState } = await import("./lib/startup-state");
  if (process.env.SKIP_STARTUP_MIGRATE === "1") {
    setMigrationState("applied");
    return;
  }

  const { STARTUP_GRACE_MS } = await import("./lib/startup/migrate-policy");

  // Nicht `await` auf den ganzen Lauf. Gemessen hat `register()` in dieser
  // Next-Version die erste Antwort zwar nicht aufgehalten — darauf zu bauen wäre
  // aber eine Wette auf ein Implementierungsdetail. Ein begrenztes Warten sagt,
  // was gemeint ist: höchstens so lange, nie unbegrenzt.
  const task = applyMigrations().catch((error) => {
    // Sollte nicht vorkommen — `applyMigrations` fängt selbst. Ein unbehandelter
    // Fehlschlag im Hintergrund würde den Prozess beenden, deshalb dieses Netz.
    console.error("[startup-migrate] Unerwarteter Fehler:", error);
  });

  // Ist die Datenbank warm — der Normalfall beim Deploy in den laufenden
  // Betrieb —, ist die Migration in ein bis drei Sekunden durch. Dann soll sie
  // vor der ersten Anfrage fertig sein. Dauert es länger, wird im Hintergrund
  // weitergearbeitet.
  await Promise.race([task, sleep(STARTUP_GRACE_MS)]);
}
