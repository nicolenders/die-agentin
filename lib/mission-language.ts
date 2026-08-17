import type { Locale } from "@/lib/i18n/config";

// Die Sprache, in der ein Vortrag gehalten wurde, gibt es an zwei Stellen: am
// Einsatz (`Mission.sessionLanguage`) und an der Zuordnung zum Briefing
// (`TalkDelivery.language`). Gepflegt wird sie an EINER Stelle in der Maske;
// hier liegt die Regel, wie daraus überall dieselbe Anzeige wird.
//
// Altdaten enthalten Freitexte („Deutsch", „English"). Die Migration räumt das
// auf, aber die Normalisierung bleibt: Es kostet nichts und verhindert, dass ein
// alter Wert eine falsche Sprache anzeigt.

const ALIASES: Record<string, Locale> = {
  de: "de",
  deu: "de",
  ger: "de",
  deutsch: "de",
  german: "de",
  "de-de": "de",
  en: "en",
  eng: "en",
  englisch: "en",
  english: "en",
  "en-gb": "en",
  "en-us": "en",
};

const LABEL: Record<Locale, Record<Locale, string>> = {
  de: { de: "Deutsch", en: "German" },
  en: { de: "Englisch", en: "English" },
};

/** Freitext oder Kürzel auf „de"/„en" bringen. Unbekanntes ergibt null. */
export function toTalkLanguage(raw: string | null | undefined): Locale | null {
  const key = (raw ?? "").trim().toLowerCase();
  return ALIASES[key] ?? null;
}

/**
 * Die anzuzeigende Vortragssprache eines Einsatzes. Der Einsatz selbst hat
 * Vorrang: dort wird sie gepflegt, und er hat sie auch ohne zugeordnetes
 * Briefing. Die Zuordnung dient als Rückfall für Altdaten.
 */
export function missionTalkLanguage(
  sessionLanguage: string | null | undefined,
  deliveryLanguage?: string | null,
): Locale | null {
  return toTalkLanguage(sessionLanguage) ?? toTalkLanguage(deliveryLanguage);
}

/** Anzeigename der Vortragssprache in der Sprache des Lesers. */
export function talkLanguageLabel(
  language: string | null | undefined,
  locale: Locale,
): string | null {
  const normalized = toTalkLanguage(language);
  return normalized ? LABEL[normalized][locale] : null;
}
