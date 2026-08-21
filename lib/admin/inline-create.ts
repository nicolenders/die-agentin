// Gemeinsame Regeln für das Anlegen eines Eintrags aus einer Erfassungsmaske
// heraus („Fachgebiet direkt in der Depesche anlegen"). Reine Logik, damit die
// beiden Stellen, an denen es darauf ankommt, dieselbe Antwort geben: der
// Server beim Schreiben und die Oberfläche beim Melden.
//
// Der Fall, der hier zählt, ist nicht das Anlegen, sondern das Doppelte. Wer
// mitten im Schreiben schnell ein Fachgebiet nachträgt, tippt es anders als
// beim letzten Mal — mit Leerzeichen zu viel, klein statt groß. Ohne diese
// Regeln stünden danach „Copilot Studio" und „copilot studio" nebeneinander in
// der Auswahl, und die öffentliche Filterung zerfiele in zwei Hälften.

/** Höchstlänge eines Namens. Länger ist kein Kategoriename, sondern ein Satz. */
export const INLINE_NAME_MAX = 80;

export interface InlineOption {
  id: string;
  name: string;
}

export type InlineCreateResult =
  | {
      ok: true;
      option: InlineOption;
      /** Wahr, wenn es den Eintrag schon gab und er nur ausgewählt wurde. */
      existed: boolean;
    }
  | { ok: false; error: string };

/** Räumt eine Eingabe auf: Ränder ab, innere Leerzeichenfolgen zu einem. */
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Vergleichsform: Groß- und Kleinschreibung sind kein Unterschied. */
function compareKey(name: string): string {
  return normalizeName(name).toLocaleLowerCase("de-DE");
}

/**
 * Findet einen vorhandenen Eintrag zum eingegebenen Namen. Wird sowohl vor dem
 * Schreiben (Server) als auch zur Meldung an die Redaktion gebraucht.
 */
export function findByName<T extends { name: string }>(
  items: T[],
  raw: string,
): T | undefined {
  const key = compareKey(raw);
  return items.find((item) => compareKey(item.name) === key);
}

/**
 * Prüft eine Eingabe, bevor irgendetwas geschrieben wird. Gibt entweder den
 * bereinigten Namen zurück oder den Grund, warum daraus nichts wird — in der
 * Formulierung, die die Redaktion zu lesen bekommt.
 */
export function checkName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = normalizeName(raw);
  if (!name) return { ok: false, error: "Kein Name eingegeben." };
  if (name.length > INLINE_NAME_MAX) {
    return {
      ok: false,
      error: `Höchstens ${INLINE_NAME_MAX} Zeichen. Das hier ist eher ein Satz als eine Bezeichnung.`,
    };
  }
  return { ok: true, name };
}
