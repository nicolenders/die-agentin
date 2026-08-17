// Canonical + hreflang je Route (Audit 1.3).
//
// Vorher stand die `languages`-Map statisch im Locale-Layout und zeigte auf
// jeder Seite auf `/de` bzw. `/en` — auf allen Unterseiten also falsch. Ein
// `canonical` gab es gar nicht. Dieser Helfer ist die einzige Stelle, an der
// beides gebaut wird; jedes `generateMetadata` einer öffentlichen Route ruft
// ihn auf.

import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { canonicalUrl } from "@/lib/site";

/**
 * Canonical + hreflang für eine Route. `path` ist der Pfad OHNE Locale-Präfix
 * und ohne führenden Slash, z. B. "legende" oder "einsaetze/cim-lingen-2026".
 * Leerer String = HQ.
 */
export function alternatesFor(locale: Locale, path = ""): Metadata["alternates"] {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const suffix = clean ? `/${clean}` : "";
  return {
    canonical: canonicalUrl(`/${locale}${suffix}`),
    languages: {
      de: canonicalUrl(`/de${suffix}`),
      en: canonicalUrl(`/en${suffix}`),
      "x-default": canonicalUrl(`/de${suffix}`),
    },
  };
}
