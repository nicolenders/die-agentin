import { MISSION_STATUSES, type MissionStatus } from "@/lib/domain";

// Ein Einsatz hat für die Redaktion genau einen Zustand: er ist geplant, wurde
// abgeschlossen, wurde abgesagt — oder er liegt im Archiv. Technisch stecken
// diese vier in zwei Spalten: `status` (PLANNED/DONE/CANCELLED, im Formular
// gepflegt) und `contentStatus` (ARCHIVED, über „Ins Archiv legen" gesetzt).
// Diese Datei führt beide zu der einen Angabe zusammen, die in der Liste steht
// und nach der dort gefiltert wird.

export const MISSION_LIST_STATUSES = [...MISSION_STATUSES, "ARCHIVED"] as const;
export type MissionListStatus = (typeof MISSION_LIST_STATUSES)[number];

export const MISSION_LIST_STATUS_LABEL: Record<MissionListStatus, string> = {
  PLANNED: "Geplant",
  DONE: "Abgeschlossen",
  CANCELLED: "Abgesagt",
  ARCHIVED: "Archiviert",
};

/** CSS-Klasse der Statusmarke (`.st …`) je Zustand. */
export const MISSION_LIST_STATUS_CLASS: Record<MissionListStatus, string> = {
  PLANNED: "sched",
  DONE: "live",
  CANCELLED: "",
  ARCHIVED: "",
};

/** Gültiger Filterwert oder "" (kein Statusfilter). */
export function parseMissionListStatus(value: string | undefined): MissionListStatus | "" {
  return MISSION_LIST_STATUSES.includes(value as MissionListStatus) ? (value as MissionListStatus) : "";
}

/**
 * Der eine Zustand eines Einsatzes. Das Archiv gewinnt: ein archivierter
 * Einsatz ist aus der laufenden Arbeit heraus, gleich welches Datum in seinem
 * Kalenderfeld steht.
 */
export function missionListStatus(status: string, contentStatus: string): MissionListStatus {
  if (contentStatus === "ARCHIVED") return "ARCHIVED";
  return MISSION_STATUSES.includes(status as MissionStatus) ? (status as MissionStatus) : "PLANNED";
}

/**
 * Prisma-`where`-Fragment zum Statusfilter. Geplant/abgeschlossen/abgesagt
 * meinen immer den laufenden Bestand — Archiviertes hat dort nichts zu suchen,
 * sonst stünde ein abgelegter Einsatz weiter unter „Geplant".
 */
export function missionStatusWhere(filter: MissionListStatus | ""): {
  status?: string;
  contentStatus?: string | { not: string };
} {
  if (filter === "") return {};
  if (filter === "ARCHIVED") return { contentStatus: "ARCHIVED" };
  return { status: filter, contentStatus: { not: "ARCHIVED" } };
}
