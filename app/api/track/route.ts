import type { NextRequest } from "next/server";
import { recordPageview } from "@/lib/analytics/track";
import { isSameOrigin } from "@/lib/http/same-origin";
import { rateLimit } from "@/lib/rate-limit";
import { isPlausiblePath, pathFromReferer } from "@/lib/analytics/beacon";
import { createHash } from "node:crypto";

// Node-Runtime: geoip-lite liest lokale Datendateien (kein Edge). Kein Cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Empfängt den Beacon der öffentlichen Seiten und schreibt einen Seitenaufruf.
//
// Der Endpunkt ist der einzige Schreibpfad der Anwendung ohne Anmeldung. Ohne
// Bremse konnte ihn jeder in einer Schleife aufrufen und die Pageview-Tabelle
// der serverlosen Azure-SQL-Datenbank beliebig weit aufblähen — das kostet Geld
// und macht die Auswertung wertlos. Drei Hürden, alle billig:
//
//   1. Herkunft: ein fremder `Origin` fliegt raus. Ein fehlender wird geduldet
//      — `sendBeacon` ist die einzige Quelle und soll nicht an einer
//      Browser-Eigenheit stillschweigend verstummen; die Menge bremst ohnehin.
//   2. Menge:    60 Aufrufe je Minute und Absender.
//   3. Form:     nur plausible eigene Pfade, keine beliebigen Zeichenketten.
//
// Antwortet weiterhin immer 204 — die Erfassung ist unkritisch und darf den
// Seitenaufruf nie blockieren; auch eine Ablehnung bleibt für den Client still.

const LIMIT_PER_MINUTE = 60;

/** Grober Absenderschlüssel fürs Rate Limit — gehasht, die IP wird nicht abgelegt. */
function senderKey(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest): Promise<Response> {
  const silent = new Response(null, { status: 204 });

  if (!isSameOrigin(req)) return silent;
  if (!rateLimit(`track:${senderKey(req)}`, LIMIT_PER_MINUTE, 60_000).ok) return silent;

  let path = "";
  try {
    const body = (await req.json()) as { path?: unknown };
    if (typeof body?.path === "string") path = body.path;
  } catch {
    // kein/kaputter Body → Referer als Rückfall
  }
  if (!path) path = pathFromReferer(req.headers.get("referer"));
  if (!isPlausiblePath(path)) return silent;

  await recordPageview({ rawPath: path, headers: req.headers });
  return silent;
}
