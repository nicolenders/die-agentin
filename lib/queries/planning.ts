import { db } from "@/lib/db";
import { identityDisplayName } from "@/lib/identities";
import { isReportOverdue, reportReadiness } from "@/lib/missions/report-task";

// Terminkalender + Archiv. Der Kalender beantwortet zwei Fragen: Wann steht ein
// Einsatz an, und wann geht eine Depesche raus? Dazu kommt je Einsatz die
// Aufgabe „Einsatzbericht schreiben" — sie hat denselben Stichtag wie der
// Einsatz und bleibt sichtbar, bis der Bericht steht.

export type PlanKind = "dispatch" | "mission" | "task";

export interface PlanTaskInfo {
  missionId: string;
  /** Ob die Aufgabe abgehakt werden darf (Texte vorhanden). */
  complete: boolean;
  /** Was noch fehlt — wörtlich für die Meldung in der Oberfläche. */
  missing: string[];
  /** Bilder fehlen: kein Hinderungsgrund, aber ein Hinweis. */
  photosMissing: boolean;
  overdue: boolean;
}

export interface PlanEntry {
  kind: PlanKind;
  id: string;
  title: string;
  status: string; // ContentStatus, bei Aufgaben OPEN | DONE
  date: Date | null; // geplantes/tatsächliches Datum bzw. Stichtag
  updatedAt: Date;
  identities: { name: string; color: string }[];
  editHref: string;
  task?: PlanTaskInfo;
}

const KIND_LABEL: Record<PlanKind, string> = {
  dispatch: "Depesche",
  mission: "Einsatz",
  task: "Einsatzbericht",
};
export function planKindLabel(kind: PlanKind): string {
  return KIND_LABEL[kind];
}

/** Kürzel für die enge Monatsansicht: D, E, A. */
export function planKindSigil(kind: PlanKind): string {
  return kind === "dispatch" ? "D" : kind === "mission" ? "E" : "A";
}

async function loadDispatches(): Promise<PlanEntry[]> {
  const rows = await db.dispatch.findMany({
    include: { translations: { where: { locale: "de" }, select: { title: true } }, identities: true },
  });
  return rows.map((d) => ({
    kind: "dispatch" as const,
    id: d.id,
    title: d.translations[0]?.title ?? "(ohne Titel)",
    status: d.status,
    date: d.publishAt ?? d.publishedAt,
    updatedAt: d.updatedAt,
    identities: d.identities.map((i) => ({ name: identityDisplayName(i, "de"), color: i.color })),
    editHref: `/admin/depeschen/bearbeiten?id=${d.id}`,
  }));
}

async function loadMissions(): Promise<PlanEntry[]> {
  const rows = await db.mission.findMany({ include: { identities: true } });
  return rows.map((m) => ({
    kind: "mission" as const,
    id: m.id,
    title: m.eventName,
    status: m.contentStatus,
    date: m.startDate,
    updatedAt: m.updatedAt,
    identities: m.identities.map((i) => ({ name: identityDisplayName(i, "de"), color: i.color })),
    editHref: `/admin/einsaetze/bearbeiten?mission=${m.id}`,
  }));
}

/**
 * Aufgaben „Einsatzbericht schreiben". Ob eine Aufgabe abgehakt werden darf,
 * entscheidet der Inhalt des Einsatzes — nicht die Aufgabe selbst. Deshalb wird
 * die Vollständigkeit hier aus den Texten und Fotos frisch berechnet.
 */
async function loadReportTasks(now: Date): Promise<PlanEntry[]> {
  const rows = await db.missionReportTask.findMany({
    include: {
      mission: {
        include: {
          identities: true,
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
      kind: "task" as const,
      id: t.id,
      title: `Einsatzbericht: ${t.mission.eventName}`,
      status: t.status,
      date: t.dueOn,
      updatedAt: t.updatedAt,
      identities: t.mission.identities.map((i) => ({ name: identityDisplayName(i, "de"), color: i.color })),
      editHref: `/admin/einsaetze/bearbeiten?mission=${t.missionId}`,
      task: {
        missionId: t.missionId,
        complete: readiness.complete,
        missing: readiness.missing,
        photosMissing: readiness.photosMissing,
        overdue: isReportOverdue(t.status, t.dueOn, now),
      },
    };
  });
}

/** Alle Termine: Einsätze, Depeschen und die Berichts-Aufgaben dazu. */
export async function getCalendarEntries(now: Date = new Date()): Promise<PlanEntry[]> {
  const [dispatches, missions, tasks] = await Promise.all([
    loadDispatches(),
    loadMissions(),
    loadReportTasks(now),
  ]);
  return [...dispatches, ...missions, ...tasks];
}

/** Archiv-Einträge (status/contentStatus = ARCHIVED) je Typ. */
export async function getArchivedEntries(kind: "dispatch" | "mission"): Promise<PlanEntry[]> {
  const all = kind === "dispatch" ? await loadDispatches() : await loadMissions();
  return all.filter((e) => e.status === "ARCHIVED");
}

/**
 * Ob der Bericht eines Einsatzes vollständig ist — die Prüfung, die auch beim
 * Abhaken serverseitig greift.
 */
export async function missionReportComplete(missionId: string): Promise<{ complete: boolean; missing: string[] }> {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    include: {
      translations: { where: { locale: "de" }, select: { eventText: true, talkText: true } },
      _count: { select: { photos: true } },
    },
  });
  if (!mission) return { complete: false, missing: ["Einsatz nicht gefunden"] };
  const de = mission.translations[0];
  const readiness = reportReadiness({
    eventText: de?.eventText,
    talkText: de?.talkText,
    photoCount: mission._count.photos,
  });
  return { complete: readiness.complete, missing: readiness.missing };
}
