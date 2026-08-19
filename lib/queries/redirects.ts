import "server-only";
import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";

const REDIRECT_TAG = tags.redirects();

// Slug-Weiterleitungen, die in der Zentrale unter „Stammdaten" gepflegt werden.
//
// Diese Tabelle wurde bisher zwar befüllt und angezeigt, aber nirgends
// angewendet: Wer einen Slug änderte, bekam eine Weiterleitung angeboten, die
// es nie gab — die alte Adresse lief weiter in den 404. Die Detailseiten lesen
// sie jetzt, bevor sie aufgeben.
//
// Bewusst gecacht: der Normalfall ist „kein Treffer", und dafür soll nicht bei
// jedem 404 die Datenbank aufwachen.

export type RedirectEntity = "post" | "dossier" | "mission";

/**
 * Zielslug für einen nicht mehr vergebenen Slug, oder `null`. Fehler der
 * Datenbank werden geschluckt — eine fehlende Weiterleitung ist ein 404, kein
 * Serverfehler.
 */
export const getRedirectTarget = cachedQuery(
  async (
    locale: string,
    fromSlug: string,
    entities: RedirectEntity[],
  ): Promise<string | null> => {
    try {
      const hit = await db.redirect.findFirst({
        where: { locale, fromSlug, entity: { in: entities } },
        select: { toSlug: true },
      });
      return hit?.toSlug ?? null;
    } catch {
      return null;
    }
  },
  ["redirect-target"],
  [REDIRECT_TAG],
);
