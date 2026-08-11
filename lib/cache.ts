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

/**
 * Wrappt eine Datenbankabfrage in einen getaggten Cache. Der erste Aufruf nach
 * einer Invalidierung erreicht die DB, alle weiteren werden aus dem Cache
 * bedient. `revalidate` als zusätzliche Sicherheitsnetz-Frist (1 h). Das Ergebnis
 * wird nach dem Cache rehydriert, damit `Date`-Felder auch bei einem Cache-
 * Treffer echte `Date`-Objekte bleiben (siehe `reviveDates`).
 */
export function cachedQuery<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[],
  cacheTags: string[],
): (...args: A) => Promise<R> {
  const cached = unstable_cache(fn, keyParts, { tags: cacheTags, revalidate: 3600 });
  return async (...args: A): Promise<R> => reviveDates(await cached(...args));
}

/** Invalidiert eine Liste von Cache-Tags. Next 16 verlangt ein Cache-Profil;
 *  „max" reicht, da wir gezielt beim Veröffentlichen invalidieren. */
export function invalidateTags(cacheTags: string[]): void {
  for (const tag of cacheTags) revalidateTag(tag, "max");
}
