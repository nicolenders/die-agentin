// Namensregeln der Veranstaltungen. Alles hier ist reine Rechnung ohne
// Datenbank: der Vergleichsschlüssel, die Bezeichnung einer Ausgabe und die
// Zeitspanne, die eine Ausgabe in der Oberfläche zeigt.

import { normalizeHyphens, slugify } from "@/lib/slug";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";

const UMLAUTS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

// Wörter, die eine Ausgabe benennen, nicht die Veranstaltung. Sie fliegen aus
// dem Vergleichsschlüssel, damit „TechDay 2024" und „TechDay – 3. Ausgabe"
// dieselbe Veranstaltung treffen. Bewusst kurz gehalten: Jahreszeiten
// („Spring", „Herbst") bleiben stehen, weil sie zwei Veranstaltungen im Jahr
// unterscheiden können.
const EDITION_WORDS = new Set(["edition", "ausgabe", "jahrgang", "vol", "volume", "no", "nr"]);

/**
 * Normalisierter Name für die Dublettenprüfung. Er entscheidet, ob zwei
 * Schreibweisen dieselbe Veranstaltung meinen — nicht, wie sie angezeigt wird.
 *
 * Entfernt werden: Groß-/Kleinschreibung, Umlaute und Diakritika, Satzzeichen,
 * Jahreszahlen (19xx/20xx), Ordnungszahlen („3.", „#3", „3rd") und die
 * Ausgabe-Wörter oben. Übrig bleibt der Kern des Namens.
 */
export function eventMatchKey(name: string): string {
  const tokens = normalizeHyphens(name)
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => UMLAUTS[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .filter((t) => !/^(19|20)\d{2}$/.test(t)) // Jahreszahl
    .filter((t) => !/^\d{1,3}(st|nd|rd|th)?$/.test(t)) // Ordnungs- und Zählzahl
    .filter((t) => !EDITION_WORDS.has(t));
  return tokens.join(" ");
}

/** Zwei Namen meinen dieselbe Veranstaltung. */
export function isSameEvent(a: string, b: string): boolean {
  const keyA = eventMatchKey(a);
  return keyA.length > 0 && keyA === eventMatchKey(b);
}

/**
 * Anzeigename für eine Veranstaltung, die aus einem Einsatznamen abgeleitet
 * wird: „TechDay 2025" wird zu „TechDay". Anders als der Vergleichsschlüssel
 * behält er Schreibweise und Umlaute — er steht in der Oberfläche.
 *
 * Bleibt nichts übrig (der Name bestand nur aus einer Jahreszahl), gilt der
 * ursprüngliche Name: lieber ein unschöner Name als gar keiner.
 */
export function eventDisplayName(name: string): string {
  const kept = normalizeHyphens(name)
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => {
      const bare = token.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
      if (!bare) return false; // reine Satzzeichen zwischen zwei Wörtern
      if (/^(19|20)\d{2}$/.test(bare)) return false;
      if (/^\d{1,3}(st|nd|rd|th)?$/.test(bare)) return false;
      const folded = bare.replace(/[äöüß]/g, (c) => UMLAUTS[c] ?? c);
      return !EDITION_WORDS.has(folded);
    })
    .join(" ")
    // Trennzeichen, die nach dem Entfernen allein stehen bleiben.
    .replace(/\s*[-–—,:|]+\s*$/g, "")
    .replace(/^\s*[-–—,:|]+\s*/g, "")
    .trim();
  return kept || name.trim();
}

/**
 * Slug einer Veranstaltung. Fällt der Name komplett weg (nur Ziffern), bleibt
 * ein sprechender Rest statt einer leeren Adresse.
 */
export function eventSlugBase(name: string): string {
  return slugify(name) || "veranstaltung";
}

/**
 * Bezeichnung einer Ausgabe. In der Regel das Jahr; ist dieses Jahr an der
 * Veranstaltung schon vergeben (zwei Ausgaben im selben Jahr), wird
 * durchgezählt: „2026 (2)".
 */
export function editionLabel(startDate: Date | null, taken: readonly string[] = []): string {
  const base = startDate ? String(startDate.getUTCFullYear()) : "Ohne Datum";
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base} (${n})`)) n += 1;
  return `${base} (${n})`;
}

/**
 * Zeitspanne einer Ausgabe als ein Text. Ein Tag steht allein, mehrere Tage
 * stehen als Spanne; ohne Datum bleibt der Text leer, damit die Oberfläche
 * nichts Halbes anzeigt.
 */
export function editionRange(
  startDate: Date | null,
  endDate: Date | null,
  locale: Locale,
): string {
  if (!startDate) return endDate ? formatDate(endDate, locale) : "";
  const start = formatDate(startDate, locale);
  if (!endDate || endDate.getTime() === startDate.getTime()) return start;
  return `${start} – ${formatDate(endDate, locale)}`;
}
