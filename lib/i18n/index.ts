import de from "./dictionaries/de";
import en from "./dictionaries/en";
import type { Locale } from "./config";

// Der Typ der Wörterbücher wird aus der deutschen Quellsprache abgeleitet.
// `Widen` ersetzt Literaltypen (durch `as const` entstanden) durch ihre
// Basistypen, sodass die STRUKTUR — nicht die konkreten deutschen Wörter — den
// Vertrag bildet, den die englische Fassung erfüllen muss.
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? Widen<U>[]
        : T extends object
          ? { -readonly [K in keyof T]: Widen<T[K]> }
          : T;

export type Dictionary = Widen<typeof de>;

const dictionaries: Record<Locale, Dictionary> = {
  de: de as unknown as Dictionary,
  en,
};

/** Lädt das Wörterbuch für die gewünschte Sprache (Server Components). */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale];
}

/**
 * Dasselbe Wörterbuch ohne `await`. Für Komponenten, die kein `async` sein
 * können oder sollen und trotzdem einen Text brauchen — etwa der Hinweis
 * „KI-generiert" am Bild (Audit 6.9), der bisher fest auf Deutsch stand.
 */
export function getDictionarySync(locale: Locale): Dictionary {
  return dictionaries[locale];
}
