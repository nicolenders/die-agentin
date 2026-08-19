import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { migrationState } from "@/lib/startup-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Leichtgewichtiger Datenbank-Check für die Status-Anzeige im Admin. Öffentlich
// und ohne Nebenwirkung (SELECT 1) — das Abfragen weckt zugleich die pausierte
// Azure-SQL-Serverless-Instanz, hält sie also bei aktiver Nutzung warm.
//
// Zusätzlich zum Verbindungstest der Migrationsstand: Sind die Migrationen beim
// Start gescheitert, arbeitet die Anwendung womöglich gegen ein altes Schema.
// `SELECT 1` merkt davon nichts und meldete bisher fröhlich „in Ordnung" — das
// ist genau die Auskunft, die man bei der Fehlersuche nicht brauchen kann.
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  const migrations = migrationState();
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json({ ok: false, migrations }, { status: 503, headers });
  }
  if (migrations === "failed") {
    return NextResponse.json(
      {
        ok: false,
        migrations,
        // Kein Fehlertext: der kann Verbindungsdaten enthalten und steht ohnehin
        // im Serverprotokoll.
        hint: "Datenbank erreichbar, aber die Migrationen sind beim Start fehlgeschlagen. Serverprotokoll prüfen und die Instanz neu starten.",
      },
      { status: 503, headers },
    );
  }
  return NextResponse.json({ ok: true, migrations }, { headers });
}
