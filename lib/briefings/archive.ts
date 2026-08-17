// Regeln rund um archivierte Briefings. Reine Logik, ohne Datenbank — damit
// prüfbar bleibt, was sonst nur im Formular sichtbar wäre.
//
// Der Gedanke: Ein archiviertes Briefing hält Nicole nicht mehr. Für neue
// Einsätze soll es deshalb nicht mehr in der Auswahl auftauchen. Was sie vor der
// Archivierung gehalten hat, bleibt aber wahr — ein alter Einsatz behält seine
// Zuordnung und kann sie auch nachträglich noch bekommen.

export type TalkArchiveState = "active" | "hidden" | "archived";

/** Alles, was zum Archiv gehört, hängt allein am Datum. */
export interface ArchivableTalk {
  archivedAt: Date | string | null;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Archiv schlägt Sichtbarkeit: ein archiviertes Briefing ist nie „aktiv". */
export function talkArchiveState(talk: ArchivableTalk & { active: boolean }): TalkArchiveState {
  if (toDate(talk.archivedAt)) return "archived";
  return talk.active ? "active" : "hidden";
}

export function isArchived(talk: ArchivableTalk): boolean {
  return toDate(talk.archivedAt) !== null;
}

/**
 * Darf dieses Briefing einem Einsatz an diesem Tag zugeordnet werden?
 *
 * - nicht archiviert → immer ja
 * - archiviert → nur, wenn der Einsatz VOR dem Archivierungsdatum liegt
 * - archiviert und Einsatzdatum unbekannt → nein (ein neuer Einsatz ohne Datum
 *   ist gedanklich „heute", und heute wird das Briefing nicht mehr gehalten)
 */
export function isSelectableForMission(
  talk: ArchivableTalk,
  missionStart: Date | string | null | undefined,
): boolean {
  const archivedAt = toDate(talk.archivedAt);
  if (!archivedAt) return true;
  const start = toDate(missionStart ?? null);
  if (!start) return false;
  return start.getTime() < archivedAt.getTime();
}

/**
 * Auswahlliste für die Einsatzmaske: alle zulässigen Briefings — plus das
 * bereits zugeordnete, auch wenn es die Regel heute ausschließen würde. Eine
 * bestehende Zuordnung darf beim Öffnen einer alten Akte nicht verschwinden.
 */
export function selectableTalks<T extends ArchivableTalk & { id: string }>(
  talks: T[],
  missionStart: Date | string | null | undefined,
  selectedId?: string | null,
): T[] {
  const allowed = talks.filter((t) => isSelectableForMission(t, missionStart));
  if (!selectedId || allowed.some((t) => t.id === selectedId)) return allowed;
  const selected = talks.find((t) => t.id === selectedId);
  return selected ? [selected, ...allowed] : allowed;
}
