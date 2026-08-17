// Zahlwörter für Fließtext (Audit 6.9).
//
// In `llms.txt` stand „zehn Fachbüchern" hartkodiert, während der Rest der Seite
// die Zahl aus der Datenbank zieht. Ausgeschrieben liest sich der Fließtext
// besser als mit Ziffer; über zwölf hinaus wird die Ziffer wieder üblich.

const GERMAN_WORDS = [
  "null",
  "ein",
  "zwei",
  "drei",
  "vier",
  "fünf",
  "sechs",
  "sieben",
  "acht",
  "neun",
  "zehn",
  "elf",
  "zwölf",
] as const;

/**
 * Zahl als deutsches Zahlwort, ab 13 als Ziffer. Für Angaben wie „Autorin von
 * zehn Fachbüchern".
 */
export function spellOutCount(value: number): string {
  if (!Number.isInteger(value) || value < 0) return String(value);
  return GERMAN_WORDS[value] ?? String(value);
}

/**
 * Häufigkeitsangabe, ausgeschrieben: „siebenmal". Ab 13 als Ziffer mit Suffix
 * („13-mal"), weil „dreizehnmal" den Satz mehr bremst als hilft.
 */
export function spellOutTimes(value: number): string {
  if (!Number.isInteger(value) || value < 1) return `${value}-mal`;
  const word = GERMAN_WORDS[value];
  if (!word) return `${value}-mal`;
  return `${value === 1 ? "ein" : word}mal`;
}
