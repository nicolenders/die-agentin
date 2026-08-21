// Der Ersetzungsmechanismus der Prompt-Werkstatt. Bewusst klein, deterministisch
// und ohne Netz: aus Vorlage plus Werten entsteht immer derselbe Text. Keine KI
// dazwischen — was hier herauskommt, hat Nicole geschrieben, nicht ein Modell
// (siehe docs/decisions/0022-prompt-werkstatt.md).
//
// Drei Regeln, mehr braucht die Vorlagensprache nicht:
//
//   {{einsatz.stadt}}          Platzhalter — wird durch den Wert ersetzt.
//   {{baustein.stil}}          Textbaustein — wird durch den Bausteintext ersetzt.
//   [[… {{x}} …]]              Wahlteil — fällt ganz weg, wenn ein Platzhalter
//                              darin keinen Wert hat.
//
// Der Wahlteil ist der Grund, warum ein fehlendes Feld keinen Satzrest wie
// „vor  Personen in “ hinterlässt. Was weggefallen ist, meldet das Ergebnis
// zurück, damit die Werkbank es benennen kann.

/** Erlaubte Zeichen eines Platzhalternamens. Kleinschreibung, Punkt gliedert. */
const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9._-]+)\s*\}\}/g;
const SEGMENT = /\[\[([\s\S]*?)\]\]/g;

/** Präfix, unter dem Vorlagen die Textbausteine ansprechen. */
export const SNIPPET_PREFIX = "baustein.";

/** Wie oft ein Baustein einen weiteren Baustein enthalten darf. */
const MAX_SNIPPET_DEPTH = 3;

export interface RenderResult {
  /** Der fertige Prompt, fertig zum Kopieren. */
  text: string;
  /** Platzhalter ohne Wert, in der Reihenfolge des Auftretens, ohne Dopplungen. */
  missing: string[];
  /** Angesprochene Bausteine, die es nicht gibt (oder die sich im Kreis drehen). */
  unknownSnippets: string[];
}

/** Alle in einem Text angesprochenen Platzhalter, ohne Dopplungen. */
export function extractPlaceholders(body: string): string[] {
  const out: string[] = [];
  for (const match of body.matchAll(PLACEHOLDER)) {
    const key = match[1]!;
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

/** Ist der Platzhalter eine Bausteinreferenz? */
export function isSnippetRef(key: string): boolean {
  return key.startsWith(SNIPPET_PREFIX);
}

/** Schlüssel des Bausteins hinter einer Referenz („baustein.stil“ → „stil“). */
export function snippetKeyOf(key: string): string {
  return key.slice(SNIPPET_PREFIX.length);
}

/**
 * Setzt Bausteine ein, bis keine Referenz mehr übrig ist — höchstens
 * `MAX_SNIPPET_DEPTH` Runden. Ein Baustein, der sich selbst enthält, bricht
 * damit nach endlich vielen Runden ab, statt den Server zu beschäftigen; die
 * übrig gebliebene Referenz wird als unbekannt gemeldet.
 */
function resolveSnippets(
  body: string,
  snippets: Record<string, string>,
  unknown: string[],
): string {
  let text = body;
  for (let round = 0; round < MAX_SNIPPET_DEPTH; round += 1) {
    let replaced = false;
    text = text.replace(PLACEHOLDER, (whole, key: string) => {
      if (!isSnippetRef(key)) return whole;
      const value = snippets[snippetKeyOf(key)];
      if (value === undefined) return whole;
      replaced = true;
      return value;
    });
    if (!replaced) break;
  }
  // Was jetzt noch als Baustein dasteht, gibt es nicht oder es hat sich im
  // Kreis gedreht. Beides ist für die Redaktion dasselbe: der Baustein fehlt.
  for (const key of extractPlaceholders(text)) {
    if (isSnippetRef(key) && !unknown.includes(snippetKeyOf(key))) {
      unknown.push(snippetKeyOf(key));
    }
  }
  return text;
}

/** Wert vorhanden? Leerstring und reine Leerzeichen zählen als „fehlt“. */
function has(values: Record<string, string>, key: string): boolean {
  const value = values[key];
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Räumt den Textfluss auf, nachdem Wahlteile weggefallen sind. Ohne das steht
 * im Prompt „light points.. “ oder „Berlin. , 12.05.“ — Satzzeichen, die vorher
 * an einem Wahlteil hingen und nun aneinanderstoßen. Ein Bildmodell stolpert
 * darüber nicht, ein Mensch beim Gegenlesen schon.
 */
function tidy(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/[ \t]{2,}/g, " ")
        .replace(/([.!?])[ \t]*,/g, "$1")
        .replace(/,[ \t]*([.!?])/g, "$1")
        .replace(/([.!?])[ \t]*(?=[.!?])/g, "")
        .replace(/ +([,.;:!?])/g, "$1")
        .trimEnd(),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Baut den Prompt. `values` sind die Platzhalterwerte, `snippets` die
 * Textbausteine nach Schlüssel.
 */
export function renderPrompt(
  body: string,
  values: Record<string, string>,
  snippets: Record<string, string> = {},
): RenderResult {
  const unknownSnippets: string[] = [];
  const missing: string[] = [];

  const noteMissing = (key: string) => {
    if (!isSnippetRef(key) && !missing.includes(key)) missing.push(key);
  };

  const withSnippets = resolveSnippets(body, snippets, unknownSnippets);

  // Wahlteile zuerst: sie entscheiden, ob ihr Inhalt überhaupt in den Text
  // kommt. Ein Wahlteil ohne Platzhalter bleibt stehen (er ist dann nur eine
  // Klammer um festen Text).
  const withSegments = withSnippets.replace(SEGMENT, (_whole, inner: string) => {
    const keys = extractPlaceholders(inner).filter((k) => !isSnippetRef(k));
    const gaps = keys.filter((k) => !has(values, k));
    if (gaps.length > 0) {
      gaps.forEach(noteMissing);
      return "";
    }
    return inner;
  });

  const text = withSegments.replace(PLACEHOLDER, (_whole, key: string) => {
    // Ein Baustein, der bis hierher überlebt hat, existiert nicht — er wird
    // entfernt statt roh im Prompt zu landen und ist bereits gemeldet.
    if (isSnippetRef(key)) return "";
    if (!has(values, key)) {
      noteMissing(key);
      return "";
    }
    return values[key]!.trim();
  });

  return { text: tidy(text), missing, unknownSnippets };
}
