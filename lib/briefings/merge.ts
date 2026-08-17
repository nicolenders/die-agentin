// Zwei Briefings zu einem zusammenführen (Audit 4.2 und 4.3).
//
// Zwei Wege haben Dubletten erzeugt:
//  * 4.2 — derselbe Titel einmal mit geschütztem Bindestrich (U+2011), einmal
//    mit normalem. `lib/slug.ts` normalisiert das jetzt, die bereits
//    entstandenen Datensätze bleiben aber doppelt.
//  * 4.3 — dieselbe Session je Sprache als eigenes Briefing. Das splittet die
//    Delivery-Counts und bläht die Kennzahl auf.
//
// Für 4.3 ist KEINE Schema-Migration nötig: `TalkTranslation` ist bereits je
// Sprache eindeutig (`@@unique([talkId, locale])`). Ein Briefing kann also
// längst einen deutschen und einen englischen Titel tragen. Zusammenführen ist
// eine reine Datenoperation — deshalb steht sie als Aktion in der Redaktion und
// nicht als einmaliges Skript: Dubletten entstehen beim Import immer wieder.

export interface MergeTranslation {
  locale: string;
  title: string;
  abstract: string | null;
}

export interface MergeTalk {
  id: string;
  translations: MergeTranslation[];
  categoryIds: string[];
  audienceIds: string[];
  identityIds: string[];
  toolIds: string[];
  deliveryIds: string[];
}

export interface MergePlan {
  /** Bleibt bestehen und übernimmt alles. */
  targetId: string;
  /** Wird archiviert und unsichtbar geschaltet. */
  sourceId: string;
  /** Deliveries, die auf das Ziel umgehängt werden. */
  moveDeliveryIds: string[];
  /** Übersetzungen, die dem Ziel fehlen und aus der Quelle übernommen werden. */
  addTranslations: MergeTranslation[];
  /** Vereinigte Verknüpfungen, die am Ziel gesetzt werden. */
  categoryIds: string[];
  audienceIds: string[];
  identityIds: string[];
  toolIds: string[];
}

function union(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

/**
 * Plant die Zusammenführung von `source` in `target`. Reine Funktion: sie liest
 * nichts und schreibt nichts, damit die Regeln testbar bleiben.
 *
 * Regeln:
 *  - Alle Deliveries der Quelle wandern zum Ziel. Damit stimmt der Count.
 *  - Eine Übersetzung wird nur übernommen, wenn das Ziel für diese Sprache
 *    noch keine hat. Der gepflegte Titel des Ziels gewinnt immer.
 *  - Verknüpfungen (Kategorien, Zielgruppen, Identitäten, Werkzeuge) werden
 *    vereinigt, nichts geht verloren.
 *  - Die Quelle wird archiviert, nicht gelöscht: die Historie bleibt wahr.
 */
export function planTalkMerge(source: MergeTalk, target: MergeTalk): MergePlan {
  if (source.id === target.id) {
    throw new Error("Ein Briefing lässt sich nicht mit sich selbst zusammenführen.");
  }
  const existing = new Set(target.translations.map((t) => t.locale));
  return {
    targetId: target.id,
    sourceId: source.id,
    moveDeliveryIds: [...source.deliveryIds],
    addTranslations: source.translations.filter((t) => !existing.has(t.locale)),
    categoryIds: union(target.categoryIds, source.categoryIds),
    audienceIds: union(target.audienceIds, source.audienceIds),
    identityIds: union(target.identityIds, source.identityIds),
    toolIds: union(target.toolIds, source.toolIds),
  };
}

/**
 * Vorschlag, welches der beiden Briefings bleiben soll: das mit den meisten
 * Einsätzen. Bei Gleichstand das mit den meisten Übersetzungen, sonst das
 * erste. So bleibt der Datensatz stehen, an dem die meiste Historie hängt.
 */
export function suggestMergeTarget(a: MergeTalk, b: MergeTalk): MergeTalk {
  if (a.deliveryIds.length !== b.deliveryIds.length) {
    return a.deliveryIds.length > b.deliveryIds.length ? a : b;
  }
  return b.translations.length > a.translations.length ? b : a;
}
