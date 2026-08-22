import { SKILL_LEVELS, SKILL_LEVEL_LABEL, isOneOf, type SkillLevel } from "@/lib/domain";
import type { Locale } from "@/lib/i18n/config";

// Fähigkeiten im Lebenslauf: Jahre Erfahrung und Selbsteinschätzung. Die Jahre
// werden aus „von"/„bis" berechnet, sobald sich beides lesen lässt — doppelte
// Pflege wäre eine Fehlerquelle, die sich mit jedem Jahreswechsel meldet.

/** Wörter, die „bis heute" meinen. */
const OPEN_END = ["heute", "jetzt", "laufend", "today", "now", "present", "ongoing"];

export interface YearMonth {
  year: number;
  /** 0–11; fehlt eine Monatsangabe, wird Januar angenommen. */
  month: number;
}

/**
 * Liest eine Zeitangabe wie „03/2018", „2018-03", „2018" oder „heute".
 * Rückgabe `null` heißt: unlesbar. „heute" liefert `open`.
 */
export function parsePeriod(value: string | null | undefined): YearMonth | "open" | null {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (OPEN_END.includes(raw)) return "open";

  const slash = /^(\d{1,2})\s*[./]\s*(\d{4})$/.exec(raw);
  if (slash) return { year: Number(slash[2]), month: Number(slash[1]) - 1 };

  const dashed = /^(\d{4})\s*-\s*(\d{1,2})$/.exec(raw);
  if (dashed) return { year: Number(dashed[1]), month: Number(dashed[2]) - 1 };

  const yearOnly = /^(\d{4})$/.exec(raw);
  if (yearOnly) return { year: Number(yearOnly[1]), month: 0 };

  return null;
}

/**
 * Jahre zwischen zwei Angaben, aufgerundet auf volle Jahre ab einem halben —
 * „seit März 2018" liest sich als „7 Jahre", nicht als „6,8".
 * Gibt `null` zurück, wenn sich der Zeitraum nicht ableiten lässt.
 */
export function computeSkillYears(
  from: string | null | undefined,
  to: string | null | undefined,
  now: Date = new Date(),
): number | null {
  const start = parsePeriod(from);
  if (start === null || start === "open") return null;
  const parsedEnd = parsePeriod(to);
  const end: YearMonth =
    parsedEnd === null || parsedEnd === "open"
      ? { year: now.getUTCFullYear(), month: now.getUTCMonth() }
      : parsedEnd;

  const months = (end.year - start.year) * 12 + (end.month - start.month);
  if (months < 0) return null;
  return Math.max(0, Math.round(months / 12));
}

/**
 * Die anzuzeigende Jahreszahl: der berechnete Wert hat Vorrang, sonst gilt die
 * manuelle Eingabe (für Fähigkeiten ohne sinnvollen Zeitraum).
 */
export function effectiveSkillYears(
  entry: { periodFrom: string | null; periodTo: string | null; skillYears: number | null },
  now: Date = new Date(),
): number | null {
  return computeSkillYears(entry.periodFrom, entry.periodTo, now) ?? entry.skillYears ?? null;
}

/** Beschriftung einer Stufe; unbekannte Werte ergeben keine Angabe. */
export function skillLevelLabel(value: string | null | undefined, locale: Locale = "de"): string | null {
  if (!isOneOf(SKILL_LEVELS, value)) return null;
  return SKILL_LEVEL_LABEL[value as SkillLevel][locale === "en" ? "en" : "de"];
}
