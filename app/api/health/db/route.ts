import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Leichtgewichtiger Datenbank-Check für die Status-Anzeige im Admin. Öffentlich
// und ohne Nebenwirkung (SELECT 1) — das Abfragen weckt zugleich die pausierte
// Azure-SQL-Serverless-Instanz, hält sie also bei aktiver Nutzung warm.
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers });
  }
}
