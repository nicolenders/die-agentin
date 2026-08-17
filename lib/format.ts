import type { Locale } from "./i18n/config";

// Zeit wird in der DB als UTC gehalten und nur zur Darstellung nach
// Europe/Berlin umgerechnet (SPEC §6, CLAUDE.md).
const TZ = "Europe/Berlin";

// Akzeptiert Date, ISO-String oder Timestamp und liefert ein gültiges Date oder
// null. Robust gegen serialisierte Datumswerte (z. B. aus dem Data-Cache).
function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(date: Date | string | number | null | undefined, locale: Locale): string {
  const d = toDate(date);
  if (!d) return "";
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    // EN mit Monatskürzel (Audit 6.8): `04/09/2026` liest ein US-Publikum als
    // 9. April. `04 Sep 2026` ist eindeutig.
    month: locale === "de" ? "2-digit" : "short",
    year: "numeric",
    timeZone: TZ,
  }).format(d);
}

export function formatDateTime(date: Date | string | number | null | undefined, locale: Locale): string {
  const d = toDate(date);
  if (!d) return "";
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    // EN mit Monatskürzel (Audit 6.8): `04/09/2026` liest ein US-Publikum als
    // 9. April. `04 Sep 2026` ist eindeutig.
    month: locale === "de" ? "2-digit" : "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(d);
}

/** Ab dieser Länge ist ein Briefing ein Workshop, kein Vortrag (Audit 4.7). */
export const WORKSHOP_MIN_MINUTES = 180;

/**
 * Vortragsdauer. Ab 90 Minuten in Stunden, weil „420′" niemand als sieben
 * Stunden liest (Audit 4.7).
 */
export function formatDuration(min: number, locale: Locale): string {
  if (min < 90) return locale === "de" ? `${min} Min.` : `${min} min`;
  const h = min / 60;
  const val = Number.isInteger(h)
    ? String(h)
    : h.toFixed(1).replace(".", locale === "de" ? "," : ".");
  return locale === "de" ? `${val} Std.` : `${val} h`;
}

/** Ob eine Dauer als Workshop-Format gilt. */
export function isWorkshopDuration(min: number | null | undefined): boolean {
  return typeof min === "number" && min >= WORKSHOP_MIN_MINUTES;
}

/** ISO-Datum (UTC) für Zeitstempel in Feeds/Sitemaps. */
export function toIso(date: Date | string | number | null | undefined): string {
  const d = toDate(date);
  return d ? d.toISOString() : "";
}
