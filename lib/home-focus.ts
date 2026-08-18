// „Woran ich gerade arbeite" auf der Startseite (Model `HomeFocus`).
//
// Die Reihe soll eine Reihe bleiben: sechs Einträge füllen zwei Zeilen à drei
// Karten sauber aus, fünf lassen die letzte Zeile angenehm offen. Ab dem
// siebten kippt der Block optisch in eine Liste und verliert seinen Zweck,
// deshalb prüft die Server-Action gegen diese Grenze, statt sie nur im
// Formular zu erwähnen.

export const HOME_FOCUS_MAX = 6;

/** true, wenn kein weiterer aktiver Eintrag mehr hinzukommen darf. */
export function homeFocusFull(activeCount: number): boolean {
  return activeCount >= HOME_FOCUS_MAX;
}

/** Verbleibende Plätze, nie negativ. */
export function homeFocusRoom(activeCount: number): number {
  return Math.max(0, HOME_FOCUS_MAX - activeCount);
}

/** Sortierwert für einen neuen Eintrag: hinten anstellen, in Zehnerschritten. */
export function nextHomeFocusSortOrder(existing: readonly number[]): number {
  if (existing.length === 0) return 10;
  return Math.max(...existing) + 10;
}

export interface HomeFocusText {
  titleDe: string;
  titleEn: string | null;
  textDe: string;
  textEn: string | null;
}

/**
 * Wählt Titel und Text in der gewünschten Sprache. Fehlt die englische Fassung,
 * greift die deutsche (SPEC §8: lieber deutscher Inhalt als eine Lücke).
 */
export function pickHomeFocusText(
  row: HomeFocusText,
  locale: string,
): { title: string; text: string } {
  const en = locale === "en";
  return {
    title: (en ? row.titleEn?.trim() : "") || row.titleDe,
    text: (en ? row.textEn?.trim() : "") || row.textDe,
  };
}
