import { db } from "@/lib/db";
import { identityDisplayName } from "@/lib/identities";
import { isPlanned } from "@/lib/visibility";

// Redaktionsplan + Archiv (Phase 4.2/4.3). Aggregiert Einträge über Typen mit
// Statusmodell. Dispatch trägt status+publishedAt vollständig; Mission trägt
// contentStatus + startDate. Talk/Publication bekommen ihr Statusfeld in einem
// Folgeschritt (siehe docs/PROGRESS.md) und erscheinen hier noch nicht.

export type PlanKind = "dispatch" | "mission";

export interface PlanEntry {
  kind: PlanKind;
  id: string;
  title: string;
  status: string;
  date: Date | null; // geplantes/tatsächliches Datum
  updatedAt: Date;
  identities: { name: string; color: string }[];
  editHref: string;
}

const KIND_LABEL: Record<PlanKind, string> = { dispatch: "Depesche", mission: "Einsatz" };
export function planKindLabel(kind: PlanKind): string {
  return KIND_LABEL[kind];
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

/** Einträge für den Redaktionsplan: Entwurf, terminiert oder zukünftig live. */
export async function getPlanEntries(now: Date = new Date()): Promise<PlanEntry[]> {
  const [dispatches, missions] = await Promise.all([loadDispatches(), loadMissions()]);
  return [...dispatches, ...missions].filter((e) => isPlanned(e.status, e.date, now));
}

/** Archiv-Einträge (status/contentStatus = ARCHIVED) je Typ. */
export async function getArchivedEntries(kind: PlanKind): Promise<PlanEntry[]> {
  const all = kind === "dispatch" ? await loadDispatches() : await loadMissions();
  return all.filter((e) => e.status === "ARCHIVED");
}
