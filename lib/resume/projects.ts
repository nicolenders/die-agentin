import type { Locale } from "@/lib/i18n/config";

// Projektreferenzen im Lebenslauf. Zwei Zeiträume (das Projekt und der eigene
// Einsatz darin), ein Aufwand in Personentagen und ein Kunde, der auf Wunsch
// anonym bleibt. Anonym heißt: Der Name taucht NIRGENDS in der Ausgabe auf —
// weder im öffentlichen Lebenslauf noch im Export.

export interface ProjectEntryLike {
  subtitle: string | null;
  clientAnonymous: boolean;
  clientSector: string | null;
}

const ANONYMOUS_FALLBACK: Record<Locale, string> = {
  de: "Kunde anonymisiert",
  en: "Client anonymised",
};

/**
 * Der Kundenname, wie er ausgegeben werden darf. Bei anonymen Kunden tritt die
 * neutrale Branchenangabe an seine Stelle, sonst ein sprechender Platzhalter.
 */
export function displayClient(entry: ProjectEntryLike, locale: Locale = "de"): string | null {
  if (entry.clientAnonymous) {
    const sector = entry.clientSector?.trim();
    return sector || ANONYMOUS_FALLBACK[locale === "en" ? "en" : "de"];
  }
  return entry.subtitle?.trim() || null;
}

/** Zeitraum als „03/2018 – heute"; fehlt beides, gibt es nichts auszugeben. */
export function formatPeriod(from: string | null | undefined, to: string | null | undefined): string | null {
  const a = from?.trim();
  const b = to?.trim();
  if (a && b) return `${a} – ${b}`;
  return a || b || null;
}

/** Aufwand als „ca. 120 PT"; 0 und leere Angaben erscheinen nicht. */
export function formatPersonDays(value: number | null | undefined, locale: Locale = "de"): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return locale === "en" ? `approx. ${value} person-days` : `ca. ${value} PT`;
}
