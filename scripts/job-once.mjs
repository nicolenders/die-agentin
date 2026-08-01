#!/usr/bin/env node
/**
 * Einmaliger Job-Tick für den Azure Container Apps Job (Cron alle 5 Minuten).
 * Ruft den internen Endpunkt /api/jobs/run genau EINMAL auf und beendet sich
 * dann (im Gegensatz zu scripts/scheduler.mjs, das lokal dauerhaft läuft).
 * Ein Cron-Job-Container muss nach getaner Arbeit terminieren.
 *
 * Erwartet die Umgebungsvariablen NEXT_PUBLIC_SITE_URL und JOB_SHARED_SECRET.
 */
const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const secret = process.env.JOB_SHARED_SECRET;

if (!secret) {
  console.error("JOB_SHARED_SECRET ist nicht gesetzt.");
  process.exit(1);
}

try {
  const res = await fetch(`${base}/api/jobs/run`, {
    method: "POST",
    headers: { "x-job-secret": secret },
  });
  const body = await res.text();
  console.log(new Date().toISOString(), res.status, body);
  process.exit(res.ok ? 0 : 1);
} catch (error) {
  console.error(new Date().toISOString(), "Fehler:", error.message);
  process.exit(1);
}
