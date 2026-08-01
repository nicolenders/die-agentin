import type { Locale } from "./i18n/config";

// Zeit wird in der DB als UTC gehalten und nur zur Darstellung nach
// Europe/Berlin umgerechnet (SPEC §6, CLAUDE.md).
const TZ = "Europe/Berlin";

export function formatDate(date: Date | null | undefined, locale: Locale): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  }).format(date);
}

export function formatDateTime(date: Date | null | undefined, locale: Locale): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(date);
}

/** ISO-Datum (UTC) für Zeitstempel in Feeds/Sitemaps. */
export function toIso(date: Date | null | undefined): string {
  return date ? date.toISOString() : "";
}
