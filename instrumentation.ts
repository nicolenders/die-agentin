// Wendet ausstehende Prisma-Migrationen beim Serverstart AN — im Node-Prozess,
// nicht über den Container-Startbefehl. Grund: Azure Container Apps kann den
// Docker-CMD überschreiben, sodass ein Startskript (scripts/start.sh) nicht
// zwingend läuft. `register()` wird von Next.js beim Booten jeder Server-Instanz
// aufgerufen und ist damit unabhängig davon. `migrate deploy` ist idempotent;
// bei pausierter serverloser DB wird mit Wartezeit erneut versucht.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_STARTUP_MIGRATE === "1") return;

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const cli = "node_modules/prisma/build/index.js";
  const attempts = 8;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const { stdout } = await run(process.execPath, [cli, "migrate", "deploy"]);
      console.log(`[startup-migrate] migrations applied (attempt ${attempt}).\n${stdout}`);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === attempts) {
        console.error(`[startup-migrate] failed after ${attempts} attempts: ${message}`);
        return;
      }
      console.warn(`[startup-migrate] attempt ${attempt}/${attempts} failed (database may be waking): ${message}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
