import de from "./dictionaries/de";
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

const loaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  de: async () => ({ default: de as unknown as Dictionary }),
  en: () => import("./dictionaries/en"),
};

/** Lädt das Wörterbuch für die gewünschte Sprache (Server Components). */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const mod = await loaders[locale]();
  return mod.default;
}
