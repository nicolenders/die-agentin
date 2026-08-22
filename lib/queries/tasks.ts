import { db } from "@/lib/db";
import { reportReadiness } from "@/lib/missions/report-task";

// Aufgabenliste der Zentrale. Heute gibt es genau eine Art Aufgabe — den
// Einsatzbericht —, deshalb liest diese Abfrage sie direkt. Kommt eine zweite
// Art dazu, ist hier die Stelle, an der sie zusammenlaufen.

export interface TaskItem {
  id: string;
  /** Der Einsatz, an dem die Aufgabe hängt. */
  missionId: string;
  eventName: string;
  city: string;
  isOnline: boolean;
  /** Einsatztag = Stichtag der Aufgabe. */
  dueOn: Date;
  status: string; // OPEN | DONE
  doneAt: Date | null;
  /** Ob sie abgehakt werden darf — aus dem Inhalt des Einsatzes berechnet. */
  complete: boolean;
  /** Was dafür noch fehlt, in Nicoles Sprache. */
  missing: string[];
  photosMissing: boolean;
  editHref: string;
}

/**
 * Alle Berichts-Aufgaben mit dem Stand des zugehörigen Einsatzes. Die
 * Vollständigkeit wird bei jedem Aufruf frisch berechnet: Ob abgehakt werden
 * darf, entscheidet der Inhalt des Einsatzes, nicht ein gespeichertes Flag.
 */
export async function getMissionTasks(): Promise<TaskItem[]> {
  const rows = await db.missionReportTask.findMany({
    orderBy: [{ status: "asc" }, { dueOn: "desc" }],
    include: {
      mission: {
        select: {
          eventName: true,
          city: true,
          isOnline: true,
          translations: { where: { locale: "de" }, select: { eventText: true, talkText: true } },
          _count: { select: { photos: true } },
        },
      },
    },
  });

  return rows.map((t) => {
    const de = t.mission.translations[0];
    const readiness = reportReadiness({
      eventText: de?.eventText,
      talkText: de?.talkText,
      photoCount: t.mission._count.photos,
    });
    return {
      id: t.id,
      missionId: t.missionId,
      eventName: t.mission.eventName,
      city: t.mission.city,
      isOnline: t.mission.isOnline,
      dueOn: t.dueOn,
      status: t.status,
      doneAt: t.doneAt,
      complete: readiness.complete,
      missing: readiness.missing,
      photosMissing: readiness.photosMissing,
      editHref: `/admin/einsaetze/bearbeiten?mission=${t.missionId}`,
    };
  });
}

/** Zahlen für die Navigation und die Einsatzzentrale. */
export interface TaskCounts {
  open: number;
  overdue: number;
  done: number;
}

export async function getTaskCounts(now: Date = new Date()): Promise<TaskCounts> {
  try {
    const [open, overdue, done] = await Promise.all([
      db.missionReportTask.count({ where: { status: "OPEN" } }),
      db.missionReportTask.count({ where: { status: "OPEN", dueOn: { lt: now } } }),
      db.missionReportTask.count({ where: { status: "DONE" } }),
    ]);
    return { open, overdue, done };
  } catch {
    return { open: 0, overdue: 0, done: 0 };
  }
}
