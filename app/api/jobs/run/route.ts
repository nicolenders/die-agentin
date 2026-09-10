import { NextResponse, after } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runScheduledPublish } from "@/lib/publish/publish";
import { runDispatchReminders } from "@/lib/publish/reminders";
import { flushPageviews } from "@/lib/analytics/track";
import { bufferedCount } from "@/lib/analytics/buffer";
import { planTick } from "@/lib/jobs/tick-plan";
import { readScheduleHint, writeScheduleHint } from "@/lib/jobs/schedule-hint";
import { computeNextDue } from "@/lib/jobs/schedule";
import { localBase, warmSite } from "@/lib/jobs/warmup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Interner Job-Endpunkt (SPEC §2, §6). Der Container Apps Job „scheduler" ruft
// diesen Endpunkt stündlich mit einem Shared Secret auf.
//
// Der Tick ist zweistufig (docs/decisions/0032-kosten-der-laufzeit.md):
//
//   1. Ohne Datenbank entscheiden, ob überhaupt etwas zu tun ist. Grundlage ist
//      die Terminnotiz, die der letzte vollständige Lauf hinterlassen hat.
//   2. Nur wenn ja: veröffentlichen, erinnern, gesammelte Seitenaufrufe
//      wegschreiben, neuen Termin notieren und den Cache wärmen — alles in
//      einem Fenster, in dem die Datenbank ohnehin wach ist.
//
// Grund: Die serverlose Datenbank wird nach Online-Zeit abgerechnet, nicht nach
// Abfragen. Ein Tick, der „nur mal nachsieht", kostete dasselbe wie eine echte
// Veröffentlichung — und alle fünf Minuten einer hielt sie rund um die Uhr wach.

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

  const now = new Date();
  const hint = await readScheduleHint();
  const plan = planTick({ now, hint, bufferedPageviews: bufferedCount() });

  if (!plan.touchDatabase) {
    return NextResponse.json({
      ok: true,
      skipped: plan.reason,
      nextDueAt: hint?.nextDueAt?.toISOString() ?? null,
    });
  }

  try {
    const result = await runScheduledPublish(now);
    // Der Erinnerungslauf darf die Veröffentlichung nicht kippen: schlägt der
    // Mailversand fehl, steht das im Ergebnis, der Job bleibt aber erfolgreich.
    let reminders: Awaited<ReturnType<typeof runDispatchReminders>>;
    try {
      reminders = await runDispatchReminders(now);
    } catch (error) {
      reminders = {
        reminded: [],
        remindedReports: [],
        skipped: error instanceof Error ? error.message : "Erinnerungslauf fehlgeschlagen.",
      };
    }

    // Die Datenbank ist jetzt wach — also alles erledigen, was auf ein solches
    // Fenster wartet: gesammelte Seitenaufrufe ablegen und den nächsten Termin
    // ausrechnen.
    const pageviews = await flushPageviews();

    let nextDueAt: Date | null = null;
    try {
      nextDueAt = await computeNextDue(now);
      await writeScheduleHint({ nextDueAt, writtenAt: new Date() });
    } catch (error) {
      // Ohne neue Notiz läuft der nächste Tick vollständig. Teurer, nicht falsch.
      console.warn(
        "[job] Nächster Termin konnte nicht bestimmt werden:",
        error instanceof Error ? error.message : error,
      );
    }

    // Nach der Antwort: den Cache füllen, solange die Datenbank wach ist. Der
    // Job-Container wartet darauf nicht (sein Zeitbudget ist knapp), die
    // Anwendung erledigt es im Hintergrund.
    after(async () => {
      const warm = await warmSite(localBase());
      console.log(`[job] Cache gewärmt: ${warm.warmed} Seiten, ${warm.failed} Fehlversuche.`);
    });

    return NextResponse.json({
      ok: true,
      reason: plan.reason,
      published: result.published,
      publishedDispatches: result.publishedDispatches,
      remindedDispatches: reminders.reminded,
      remindedReports: reminders.remindedReports,
      pageviews,
      nextDueAt: nextDueAt ? nextDueAt.toISOString() : null,
      ...(reminders.skipped ? { remindersSkipped: reminders.skipped } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job fehlgeschlagen.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
