// Rückkehr in eine gefilterte Liste. Wer im Adminbereich filtert, einen Eintrag
// öffnet und wieder zurückgeht, will seine Auswahl vorfinden — nicht die
// vollständige Liste und die Arbeit von vorn. Die Listen tragen ihren Zustand
// ohnehin in der URL; diese Datei reicht ihn an die Maske weiter und wieder
// zurück.

/** Name des Parameters, unter dem die Rückkehradresse mitläuft. */
export const RETURN_PARAM = "zurueck";

/**
 * Prüft eine Rückkehradresse aus der URL. Zurück kommt nur ein relativer Pfad,
 * der genau zu der erwarteten Liste gehört; alles andere fällt auf die Liste
 * ohne Filter zurück. Eine Adresse aus der URL darf niemanden auf eine fremde
 * Seite schicken, auch nicht über `//host` oder eine absolute URL.
 */
export function safeReturnTo(value: string | undefined | null, listPath: string): string {
  if (!value) return listPath;
  if (!value.startsWith(listPath)) return listPath;
  const rest = value.slice(listPath.length);
  // Direkt die Liste, oder die Liste mit Query — sonst wäre „/admin/einsaetze.example.com" gültig.
  if (rest !== "" && !rest.startsWith("?")) return listPath;
  // Steuerzeichen und Anführungszeichen haben in einer Adresse nichts zu suchen.
  if (/[\s"'<>\\]/.test(value)) return listPath;
  return value;
}

/**
 * Setzt Parameter auf einen relativen Pfad, der bereits eine Query haben kann.
 * Werte `undefined` werden ausgelassen, bestehende gleichen Namens ersetzt.
 */
export function withParams(href: string, params: Record<string, string | undefined>): string {
  const [path, query = ""] = href.split("?", 2);
  const search = new URLSearchParams(query);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") search.delete(key);
    else search.set(key, value);
  }
  const qs = search.toString();
  return `${path}${qs ? `?${qs}` : ""}`;
}

/** Link in die Bearbeitungsmaske, der die aktuelle Listenansicht mitnimmt. */
export function editHref(editPath: string, id: string, returnTo: string): string {
  return withParams(editPath, { id, [RETURN_PARAM]: returnTo });
}
