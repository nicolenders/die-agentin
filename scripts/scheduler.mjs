#!/usr/bin/env node
/**
 * Lokaler Scheduler für die Entwicklung. Ruft alle 5 Minuten den internen
 * Job-Endpunkt auf und veröffentlicht fällige, terminierte Beiträge (SPEC §6).
 * Produktiv übernimmt das ein Azure Container Apps Job (Cron alle 5 Minuten,
 * Bicep in M8), der denselben Endpunkt mit demselben Shared Secret aufruft.
 *
 * Nutzung:  JOB_SHARED_SECRET=… node scripts/scheduler.mjs [baseUrl]
 */
const base = process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const secret = process.env.JOB_SHARED_SECRET;
const intervalMs = 5 * 60 * 1000;

if (!secret) {
  console.error("JOB_SHARED_SECRET ist nicht gesetzt.");
  process.exit(1);
}

async function tick() {
  try {
    const res = await fetch(`${base}/api/jobs/run`, {
      method: "POST",
      headers: { "x-job-secret": secret },
    });
    const body = await res.json();
    console.log(new Date().toISOString(), res.status, JSON.stringify(body));
  } catch (error) {
    console.error(new Date().toISOString(), "Fehler:", error.message);
  }
}

console.log(`Scheduler gestartet → ${base}/api/jobs/run alle 5 Minuten.`);
await tick();
setInterval(tick, intervalMs);
