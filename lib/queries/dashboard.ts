import { db } from "@/lib/db";

// Kennzahlen der Einsatzzentrale. Je Inhaltsart dieselben drei Zahlen —
// Entwurf, veröffentlicht, Archiv — damit auf einen Blick klar ist, wo etwas
// liegen geblieben ist.
//
// Einsätze und Depeschen führen dafür einen Status (ContentStatus). Briefings
// haben keinen: dort ist „veröffentlicht" gleich „auf der Website sichtbar",
// „Entwurf" gleich „verborgen" und „Archiv" das Archivierungsdatum.

export interface ContentCounts {
  drafts: number;
  published: number;
  archived: number;
}

export interface DashboardStats {
  missions: ContentCounts;
  briefings: ContentCounts;
  dispatches: ContentCounts;
  /** true, wenn die (serverlose) DB nicht erreichbar war — die Zentrale zeigt
   *  dann einen „Datenbank wird geweckt"-Zustand statt eines Timeouts (SPEC §2.1). */
  dbUnavailable: boolean;
}

const EMPTY: ContentCounts = { drafts: 0, published: 0, archived: 0 };

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [
      missionDrafts,
      missionPublished,
      missionArchived,
      briefingDrafts,
      briefingPublished,
      briefingArchived,
      dispatchDrafts,
      dispatchPublished,
      dispatchArchived,
    ] = await Promise.all([
      db.mission.count({ where: { contentStatus: "DRAFT" } }),
      db.mission.count({ where: { contentStatus: "PUBLISHED" } }),
      db.mission.count({ where: { contentStatus: "ARCHIVED" } }),
      db.talk.count({ where: { archivedAt: null, active: false } }),
      db.talk.count({ where: { archivedAt: null, active: true } }),
      db.talk.count({ where: { NOT: { archivedAt: null } } }),
      db.dispatch.count({ where: { status: "DRAFT" } }),
      db.dispatch.count({ where: { status: "PUBLISHED" } }),
      db.dispatch.count({ where: { status: "ARCHIVED" } }),
    ]);

    return {
      missions: { drafts: missionDrafts, published: missionPublished, archived: missionArchived },
      briefings: { drafts: briefingDrafts, published: briefingPublished, archived: briefingArchived },
      dispatches: { drafts: dispatchDrafts, published: dispatchPublished, archived: dispatchArchived },
      dbUnavailable: false,
    };
  } catch {
    return { missions: EMPTY, briefings: EMPTY, dispatches: EMPTY, dbUnavailable: true };
  }
}
