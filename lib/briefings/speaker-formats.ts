import { locales, type Locale } from "@/lib/i18n/config";

// Gepflegte Vortragsformate der Akte (Model `SpeakerFormat`). Reine Funktionen,
// damit die Darstellung dieselbe bleibt, egal ob die Formate aus der Redaktion
// stammen oder aus den Briefing-Dauern abgeleitet sind.

/** Sprachkürzel aus dem gespeicherten Feld („de,en") lesen. */
export function parseFormatLanguages(value: string | null | undefined): Locale[] {
  if (!value) return [];
  const wanted = new Set(
    value
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  );
  // Feste Reihenfolge (DE vor EN), unabhängig von der Eingabe.
  return locales.filter((l) => wanted.has(l));
}

/** Anzeige der Sprachen: „DE · EN". Leere Auswahl ergibt einen leeren Text. */
export function languagesLabel(langs: readonly Locale[]): string {
  return langs.map((l) => l.toUpperCase()).join(" · ");
}

// --------------------------------------------------------------- Dauer

// Ein Lightning Talk dauert Minuten, ein Workshop Stunden oder Tage. Alles in
// Minuten zu erfassen hieß, bei jeder Pflege umzurechnen — und „960 Min." liest
// niemand als zwei Tage. Die Einheit wird deshalb je Format gewählt und genau
// so angezeigt, wie sie gewählt wurde: Wer 180 Minuten pflegt, meint Minuten.
export const DURATION_UNITS = ["MINUTES", "HOURS", "DAYS"] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

/** Normalisiert einen gespeicherten Wert auf eine gültige Einheit. */
export function toDurationUnit(value: string | null | undefined): DurationUnit {
  const upper = String(value ?? "").trim().toUpperCase();
  return (DURATION_UNITS as readonly string[]).includes(upper)
    ? (upper as DurationUnit)
    : "MINUTES";
}

// Abkürzungen wie in `lib/format.ts` (`formatDuration`) — dort stehen „Min."
// und „Std." seit jeher direkt im Code, das bleibt hier gleich. Nur Tage haben
// eine Mehrzahl; sie richtet sich nach der Zahl, die davor steht.
const UNIT_LABEL: Record<DurationUnit, Record<Locale, { one: string; other: string }>> = {
  MINUTES: {
    de: { one: "Min.", other: "Min." },
    en: { one: "min", other: "min" },
  },
  HOURS: {
    de: { one: "Std.", other: "Std." },
    en: { one: "h", other: "h" },
  },
  DAYS: {
    de: { one: "Tag", other: "Tage" },
    en: { one: "day", other: "days" },
  },
};

/** Einheit im Klartext, passend zur Anzahl („1 Tag" gegen „2 Tage"). */
export function durationUnitLabel(unit: DurationUnit, count: number, locale: Locale): string {
  const labels = UNIT_LABEL[unit][locale];
  return count === 1 ? labels.one : labels.other;
}

/**
 * Dauer eines Formats in der gewählten Einheit. Ein Bereich wird als
 * „45 bis 60 Min." bzw. „1 bis 2 Tage" gezeigt, ein einzelner Wert als
 * „3 Std."; fehlt beides, bleibt die Angabe leer, statt eine erfundene Zahl zu
 * zeigen. Vertauschte Grenzen werden stillschweigend gedreht.
 */
export function formatDurationRange(
  durationFrom: number | null | undefined,
  durationTo: number | null | undefined,
  unit: DurationUnit,
  locale: Locale,
): string {
  const values = [durationFrom, durationTo].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0,
  );
  if (values.length === 0) return "";
  const low = Math.min(...values);
  const high = Math.max(...values);
  // Die Einheit steht einmal am Ende und richtet sich nach dem oberen Wert:
  // „1 bis 2 Tage", nicht „1 Tag bis 2 Tage".
  const label = durationUnitLabel(unit, high, locale);
  if (low === high) return `${low} ${label}`;
  const to = locale === "en" ? "to" : "bis";
  return `${low} ${to} ${high} ${label}`;
}
