import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { migrationState } from "@/lib/startup-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Leichtgewichtiger Datenbank-Check für die Status-Anzeige im Admin. Öffentlich
// und ohne Nebenwirkung (SELECT 1) — das Abfragen weckt zugleich die pausierte
// Azure-SQL-Serverless-Instanz, hält sie also bei aktiver Nutzung warm.
//
// Zwei Auskünfte, ZWEI Felder — und das ist der Punkt:
//
//   `ok`         Antwortet die Datenbank? Nur davon hängt ab, ob die Zentrale
//                das Bearbeiten sperrt.
//   `migrations` Sind die Migrationen beim Start durchgelaufen? Eine
//                betriebliche Auskunft, die niemanden aussperren darf.
//
// Vorher waren beide in `ok` zusammengefasst: Eine gescheiterte Startmigration
// ergab 503, und die Zentrale legte daraufhin dauerhaft das Overlay „Datenbank
// wird geweckt" über die Oberfläche — obwohl die Datenbank erreichbar war und
// Inhalte sichtbar und bearbeitbar blieben. Zwei verschiedene Lagen in einem
// Signal führen zu genau dieser Art von Widerspruch: Die Anzeige sagt das eine,
// die Anwendung tut das andere.
//
// Eine fehlgeschlagene Migration bleibt ein ernster Hinweis — sie gehört ins
// Protokoll und als ruhige Warnung in die Kopfzeile, nicht in eine Sperre.
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  const migrations = migrationState();
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json({ ok: false, migrations }, { status: 503, headers });
  }
  return NextResponse.json({ ok: true, migrations }, { headers });
}
