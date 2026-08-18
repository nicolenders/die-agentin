import { formatDuration } from "@/lib/format";
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

/**
 * Dauer eines Formats. Ein Bereich wird als „45 bis 60 Min." gezeigt, ein
 * einzelner Wert als „45 Min."; fehlt beides, bleibt die Zelle leer statt eine
 * erfundene Zahl zu zeigen. Vertauschte Grenzen werden stillschweigend gedreht.
 */
export function formatMinutesRange(
  minutesMin: number | null | undefined,
  minutesMax: number | null | undefined,
  locale: Locale,
): string {
  const values = [minutesMin, minutesMax].filter(
    (m): m is number => typeof m === "number" && Number.isFinite(m) && m > 0,
  );
  if (values.length === 0) return "";
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (low === high) return formatDuration(low, locale);
  const to = locale === "en" ? "to" : "bis";
  // Innerhalb derselben Einheit reicht die nackte Zahl vorne („45 bis 60 Min.").
  // Wechselt die Einheit, bekommt auch die Untergrenze ihre („45 Min. bis 3 Std.").
  const sameUnit = low < 90 === high < 90;
  const from = sameUnit ? String(low) : formatDuration(low, locale);
  return `${from} ${to} ${formatDuration(high, locale)}`;
}
