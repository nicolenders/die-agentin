import type { NextRequest } from "next/server";
import { recordPageview } from "@/lib/analytics/track";

// Node-Runtime: geoip-lite liest lokale Datendateien (kein Edge). Kein Cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Empfängt den Beacon der öffentlichen Seiten und schreibt einen Seitenaufruf.
// Antwortet immer 204 — die Erfassung ist unkritisch und darf nichts blockieren.
export async function POST(req: NextRequest): Promise<Response> {
  let path = "";
  try {
    const body = (await req.json()) as { path?: unknown };
    if (typeof body?.path === "string") path = body.path;
  } catch {
    // kein/kaputter Body → Referer als Rückfall
  }
  if (!path) path = req.headers.get("referer") ?? "";
  if (path) {
    await recordPageview({ rawPath: path, headers: req.headers });
  }
  return new Response(null, { status: 204 });
}
