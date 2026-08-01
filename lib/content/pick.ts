import type { Locale } from "@/lib/i18n/config";

export interface HasLocale {
  locale: string;
}

export interface Picked<T> {
  translation: T;
  /** true, wenn die gewünschte Sprache fehlte und auf DE zurückgefallen wurde. */
  fallback: boolean;
  /** Sprache des tatsächlich gewählten Inhalts (für das lang-Attribut). */
  contentLocale: Locale;
}

/**
 * Wählt die Übersetzung für die gewünschte Sprache (SPEC §8). Fehlt sie, fällt
 * die Auswahl auf DE zurück (mit sichtbarem Hinweis) — kein stiller Fallback.
 * Gibt null zurück, wenn gar keine Übersetzung existiert.
 */
export function pickTranslation<T extends HasLocale>(
  translations: T[],
  locale: Locale,
): Picked<T> | null {
  const requested = translations.find((t) => t.locale === locale);
  if (requested) {
    return { translation: requested, fallback: false, contentLocale: locale };
  }
  const german = translations.find((t) => t.locale === "de");
  if (german) {
    return { translation: german, fallback: locale !== "de", contentLocale: "de" };
  }
  const first = translations[0];
  if (first) {
    const cl = first.locale === "en" ? "en" : "de";
    return { translation: first, fallback: cl !== locale, contentLocale: cl };
  }
  return null;
}
