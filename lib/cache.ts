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
};

/**
 * Wrappt eine Datenbankabfrage in einen getaggten Cache. Der erste Aufruf nach
 * einer Invalidierung erreicht die DB, alle weiteren werden aus dem Cache
 * bedient. `revalidate` als zusätzliche Sicherheitsnetz-Frist (1 h).
 */
export function cachedQuery<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[],
  cacheTags: string[],
): (...args: A) => Promise<R> {
  return unstable_cache(fn, keyParts, { tags: cacheTags, revalidate: 3600 });
}

/** Invalidiert eine Liste von Cache-Tags. Next 16 verlangt ein Cache-Profil;
 *  „max" reicht, da wir gezielt beim Veröffentlichen invalidieren. */
export function invalidateTags(cacheTags: string[]): void {
  for (const tag of cacheTags) revalidateTag(tag, "max");
}
