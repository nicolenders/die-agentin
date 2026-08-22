import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runScheduledPublish } from "@/lib/publish/publish";
import { runDispatchReminders } from "@/lib/publish/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Interner Job-Endpunkt (SPEC §2, §6). Der Container Apps Job „scheduler" ruft
// diesen Endpunkt alle 5 Minuten mit einem Shared Secret auf und weckt so die
// Web-Instanz. Verarbeitet fällige terminierte Beiträge und verschickt die
// Erinnerungen an nahende Veröffentlichungsdaten von Depeschen.

function authorized(request: Request): boolean {
  const secret = process.env.JOB_SHARED_SECRET;
  if (!secret) return false;
  const provided =
    request.headers.get("x-job-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }
  try {
    const result = await runScheduledPublish();
    // Der Erinnerungslauf darf die Veröffentlichung nicht kippen: schlägt der
    // Mailversand fehl, steht das im Ergebnis, der Job bleibt aber erfolgreich.
    let reminders: Awaited<ReturnType<typeof runDispatchReminders>>;
    try {
      reminders = await runDispatchReminders();
    } catch (error) {
      reminders = {
        reminded: [],
        remindedReports: [],
        skipped: error instanceof Error ? error.message : "Erinnerungslauf fehlgeschlagen.",
      };
    }
    return NextResponse.json({
      ok: true,
      published: result.published,
      publishedDispatches: result.publishedDispatches,
      remindedDispatches: reminders.reminded,
      remindedReports: reminders.remindedReports,
      ...(reminders.skipped ? { remindersSkipped: reminders.skipped } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job fehlgeschlagen.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
