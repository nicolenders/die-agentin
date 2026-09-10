import { unstable_cache } from "next/cache";
import { revalidateTag } from "next/cache";

// Cache-Tags (SPEC §2.1). Öffentliche Datenzugriffe werden mit `unstable_cache`
// gecacht und mit Tags versehen; ein normaler Seitenaufruf berührt so die DB
// nicht. Beim Veröffentlichen invalidiert der Publish-Vorgang gezielt die
// betroffenen Tags (siehe `lib/publish` in M3).

export const tags = {
  post: (id: string) => `post:${id}`,
  postList: (locale: string) => `list:signals:${locale}`,
  dossier: (id: string) => `dossier:${id}`,
  dossierList: (locale: string) => `list:dossiers:${locale}`,
  mission: (id: string) => `mission:${id}`,
  missionList: (locale: string) => `list:missions:${locale}`,
  briefingList: (locale: string) => `list:briefings:${locale}`,
  publicationList: (locale: string) => `list:publications:${locale}`,
  certificationList: (locale: string) => `list:certifications:${locale}`,
  legend: (locale: string) => `legend:${locale}`,
  identity: (id: string) => `identity:${id}`,
  identityList: (locale: string) => `list:identities:${locale}`,
  dispatch: (id: string) => `dispatch:${id}`,
  dispatchList: (locale: string) => `list:dispatches:${locale}`,
};

// Vollständiger ISO-8601-Zeitstempel (so serialisiert Prisma `DateTime`).
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Wandelt ISO-Zeitstempel-Strings rekursiv zurück in `Date`. `unstable_cache`
 * serialisiert seinen Rückgabewert; bei einem Cache-Treffer kommen `Date`-Felder
 * als String zurück. Ohne diese Rehydrierung würden Aufrufe wie
 * `date.getUTCFullYear()` oder `Intl.DateTimeFormat().format(date)` auf einem
 * String scheitern (der Grund für weiße Fehlerseiten nach dem ersten Aufruf).
 */
export function reviveDates<T>(value: T): T {
  if (value == null || typeof value !== "object") {
    if (typeof value === "string" && ISO_DATETIME.test(value)) {
      return new Date(value) as unknown as T;
    }
    return value;
  }
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((v) => reviveDates(v)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) out[key] = reviveDates(v);
  return out as T;
}

/** Sicherheitsnetz-Frist des Caches: 24 Stunden.
 *
 *  Vorher stand hier eine Stunde. Das war teuer und langsam zugleich: Nach
 *  Ablauf erreicht der nächste Seitenaufruf wieder die Datenbank — und die ist
 *  serverlos und pausiert. Der Leser wartete dann auf das Aufwachen (30–60 s),
 *  und die Datenbank blieb danach für die Dauer des Auto-Pause-Delays online,
 *  bezahlt. Bei zwei Dutzend gecachten Zugriffen ergab das rund um die Uhr eine
 *  wache Datenbank, ausgelöst allein durch das Ablaufen des Caches.
 *
 *  Die Frist ist ohnehin nur das Netz: Beim Veröffentlichen und bei jeder
 *  Änderung im Adminbereich wird gezielt über Tags invalidiert, und der
 *  Job-Lauf wärmt anschließend nach (lib/jobs/warmup.ts). Siehe
 *  docs/decisions/0032-kosten-der-laufzeit.md. */
const CACHE_TTL_SECONDS = 86_400;

/**
 * Wrappt eine Datenbankabfrage in einen getaggten Cache. Der erste Aufruf nach
 * einer Invalidierung erreicht die DB, alle weiteren werden aus dem Cache
 * bedient. Das Ergebnis wird nach dem Cache rehydriert, damit `Date`-Felder
 * auch bei einem Cache-Treffer echte `Date`-Objekte bleiben (siehe
 * `reviveDates`).
 */
export function cachedQuery<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[],
  cacheTags: string[],
): (...args: A) => Promise<R> {
  const cached = unstable_cache(fn, keyParts, { tags: cacheTags, revalidate: CACHE_TTL_SECONDS });
  return async (...args: A): Promise<R> => reviveDates(await cached(...args));
}

/** Invalidiert eine Liste von Cache-Tags. Next 16 verlangt ein Cache-Profil;
 *  „max" reicht, da wir gezielt beim Veröffentlichen invalidieren.
 *
 *  Nebenwirkung mit Absicht: Jede Invalidierung verwirft auch die Terminnotiz
 *  des Jobs. Wer einen Beitrag ändert, kann einen Termin verschoben haben —
 *  der nächste Tick sieht dann selbst in der Datenbank nach, statt einer
 *  veralteten Notiz zu glauben (lib/jobs/tick-plan.ts). Der Import ist
 *  absichtlich dynamisch: die Blob-Ablage soll nicht in jedem Modulgraphen
 *  landen, der nur invalidieren will. */
export function invalidateTags(cacheTags: string[]): void {
  for (const tag of cacheTags) revalidateTag(tag, "max");
  void import("@/lib/jobs/schedule-hint")
    .then((m) => m.clearScheduleHint())
    .catch(() => {
      // Bleibt die Notiz liegen, verfällt sie spätestens nach sechs Stunden.
    });
}
