import { db } from "@/lib/db";
import { reportReadiness } from "./report-task";

// Zu JEDEM Einsatz gehört genau eine Aufgabe „Einsatzbericht schreiben" — auch
// zu einem, der über den Import hereinkommt. Diese Funktion ist die eine
// Stelle, die das sicherstellt; wer einen Einsatz anlegt oder ändert, ruft sie
// auf, statt die Regel zu wiederholen.
//
// Stichtag ist der Einsatztag. Verschiebt er sich, wandert die Aufgabe mit —
// und die bereits verschickten Erinnerungen werden zurückgesetzt, damit sie zum
// neuen Termin wieder greifen.

export interface EnsureReportTaskInput {
  missionId: string;
  /** Der Einsatztag. */
  startDate: Date;
  /**
   * Inhalte des Einsatzes, wenn sie ohnehin zur Hand sind. Fehlen sie, werden
   * sie gelesen — die Regel darf nicht davon abhängen, wer sie aufruft.
   */
  content?: { eventTextDe: string | null; talkTextDe: string | null; photoCount: number };
}

export async function ensureMissionReportTask(input: EnsureReportTaskInput): Promise<void> {
  const existing = await db.missionReportTask.findUnique({
    where: { missionId: input.missionId },
    select: { id: true, status: true, dueOn: true },
  });

  if (!existing) {
    await db.missionReportTask.create({
      data: { missionId: input.missionId, dueOn: input.startDate, status: "OPEN" },
    });
    return;
  }

  const content = input.content ?? (await loadContent(input.missionId));
  const ready = reportReadiness({
    eventText: content.eventTextDe,
    talkText: content.talkTextDe,
    photoCount: content.photoCount,
  });
  const moved = existing.dueOn.getTime() !== input.startDate.getTime();

  await db.missionReportTask.update({
    where: { missionId: input.missionId },
    data: {
      dueOn: input.startDate,
      // Neuer Termin heißt: beide Erinnerungen gelten wieder.
      ...(moved ? { reminderBeforeSentAt: null, reminderAfterSentAt: null } : {}),
      // Verschwindet der Text wieder, geht die Aufgabe erneut auf. Abgehakt
      // wird sie nur von Hand — Vollständigkeit allein ist keine Erledigung.
      ...(existing.status === "DONE" && !ready.complete ? { status: "OPEN", doneAt: null } : {}),
    },
  });
}

async function loadContent(missionId: string) {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: {
      translations: { where: { locale: "de" }, select: { eventText: true, talkText: true } },
      _count: { select: { photos: true } },
    },
  });
  return {
    eventTextDe: mission?.translations[0]?.eventText ?? null,
    talkTextDe: mission?.translations[0]?.talkText ?? null,
    photoCount: mission?._count.photos ?? 0,
  };
}
