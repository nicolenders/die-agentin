// i18n-Grundkonfiguration (SPEC §5, §8). DE ist Quellsprache und wird nicht
// weggekürzt; EN ist optional.

export const locales = ["de", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "de";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "de" || value === "en";
}

/** Die jeweils andere Sprache — für Sprachumschalter und hreflang. */
export function otherLocale(locale: Locale): Locale {
  return locale === "de" ? "en" : "de";
}
