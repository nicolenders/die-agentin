// Auswahl der Einträge für einen Lebenslauf-Export.
//
// Im Adminbereich hakt Nicole in einem Dialog an, was in diesen einen
// Lebenslauf gehört. Das Ergebnis reist als Query-Parameter zur /cv-Seite —
// nichts wird gespeichert, jeder Export ist ein eigener Auszug.
//
// Zwei Parameter, weil eine Adresse kurz bleiben soll:
//   `nur=<ids>`  → NUR diese Einträge (bei kleiner Auswahl kürzer)
//   `aus=<ids>`  → alle außer diesen (bei großer Auswahl kürzer)
// Ohne beide Parameter ist der Lebenslauf vollständig. Das hält die nackte
// Adresse `/de/cv` als „alles, was da ist“ am Leben.

export const SELECT_ONLY_PARAM = "nur";
export const SELECT_EXCEPT_PARAM = "aus";

/** Liest eine Komma-Liste von Kennungen; leer bzw. fehlend ergibt `null`. */
export function parseIdList(raw: string | string[] | undefined): Set<string> | null {
  if (raw === undefined) return null;
  const value = Array.isArray(raw) ? raw.join(",") : raw;
  const ids = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // Ein leerer Parameter ist eine Aussage: „nichts davon“. Er darf nicht in
  // „alles“ umschlagen, sonst enthielte ein bewusst leerer Auszug plötzlich
  // den gesamten Bestand.
  return new Set(ids);
}

export interface ResumeSelection {
  /** Ist gesetzt, gilt ausschließlich diese Menge. */
  only: Set<string> | null;
  /** Diese Kennungen fallen in jedem Fall heraus. */
  except: Set<string>;
}

/** Baut die Auswahl aus den Query-Parametern einer Anfrage. */
export function selectionFromParams(params: {
  [SELECT_ONLY_PARAM]?: string | string[];
  [SELECT_EXCEPT_PARAM]?: string | string[];
}): ResumeSelection {
  return {
    only: parseIdList(params[SELECT_ONLY_PARAM]),
    except: parseIdList(params[SELECT_EXCEPT_PARAM]) ?? new Set<string>(),
  };
}

/** Gehört ein Eintrag in diesen Auszug? */
export function isSelected(selection: ResumeSelection, id: string): boolean {
  if (selection.except.has(id)) return false;
  return selection.only === null || selection.only.has(id);
}

/** Filtert eine Liste von Einträgen mit Kennung auf die gewählten. */
export function filterSelected<T extends { id: string }>(
  selection: ResumeSelection,
  items: readonly T[],
): T[] {
  return items.filter((item) => isSelected(selection, item.id));
}

/**
 * Die kürzere der beiden Schreibweisen für eine Auswahl. Bei 60 Einträgen und
 * zwei Abwahlen wäre eine Positivliste über tausend Zeichen lang — deshalb
 * entscheidet die Anzahl, welcher Parameter gesetzt wird.
 *
 * Ist alles gewählt, entsteht kein Parameter: `/de/cv` bleibt der volle
 * Lebenslauf.
 */
export function buildSelectionParams(
  allIds: readonly string[],
  selectedIds: readonly string[],
): Record<string, string> {
  const selected = new Set(selectedIds);
  const known = allIds.filter((id) => selected.has(id));
  const missing = allIds.filter((id) => !selected.has(id));
  if (missing.length === 0) return {};
  // Gleichstand geht an die Ausschlussliste: Sie beschreibt „alles bis auf“,
  // und neue Einträge sind dann automatisch dabei.
  if (known.length < missing.length) return { [SELECT_ONLY_PARAM]: known.join(",") };
  return { [SELECT_EXCEPT_PARAM]: missing.join(",") };
}
