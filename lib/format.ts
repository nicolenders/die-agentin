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
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  }).format(d);
}

export function formatDateTime(date: Date | string | number | null | undefined, locale: Locale): string {
  const d = toDate(date);
  if (!d) return "";
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(d);
}

/** ISO-Datum (UTC) für Zeitstempel in Feeds/Sitemaps. */
export function toIso(date: Date | string | number | null | undefined): string {
  const d = toDate(date);
  return d ? d.toISOString() : "";
}
