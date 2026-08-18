import type { Locale } from "@/lib/i18n/config";

// Teilen-Vorlagen (manuelles Social-Media-Teilen). Ein Eintrag (Einsatz,
// Briefing, Depesche) wird über einen fertigen, wiedererkennbaren Text mit Link
// geteilt. Die Vorlagen sind je Typ und Sprache im Admin pflegbar; hier stehen
// die Standardtexte in der Stimme der Agentin. Reine Logik → testbar.

export const SHARE_TYPES = ["mission", "briefing", "dispatch"] as const;
export type ShareType = (typeof SHARE_TYPES)[number];

export const SHARE_TYPE_LABEL: Record<ShareType, string> = {
  mission: "Einsatz",
  briefing: "Briefing",
  dispatch: "Depesche",
};

// Platzhalter: {title} {url} {identities} {city} {date}
export const DEFAULT_SHARE_TEMPLATES: Record<ShareType, Record<Locale, string>> = {
  mission: {
    de: "🛰️ Neuer Einsatz: „{title}“ in {city}. Unterwegs als {identities}. Was ich mitbringe und wo ihr mich trefft:\n{url}",
    en: "🛰️ New mission: “{title}” in {city}. On site as {identities}. What I'm bringing and where to find me:\n{url}",
  },
  briefing: {
    de: "🎙️ Aus meinem Repertoire: „{title}“. Ein Briefing als {identities}: kompakt, praxisnah, direkt einsetzbar. Alle Details:\n{url}",
    en: "🎙️ From my repertoire: “{title}”. A briefing as {identities}: compact, hands-on, ready to use. All details:\n{url}",
  },
  dispatch: {
    de: "📡 Neue Depesche: „{title}“. Meldung aus dem Feld als {identities}. Reinlesen:\n{url}",
    en: "📡 New dispatch: “{title}”. A field report as {identities}. Read on:\n{url}",
  },
};

export function shareTemplateKey(type: ShareType, locale: Locale): string {
  return `share.template.${type}.${locale}`;
}

export interface ShareVars {
  title: string;
  url: string;
  identities: string[];
  city?: string | null;
  date?: string | null;
}

/** Identitätsnamen menschenlesbar verbinden; leer → „die Agentin" / „the Agent". */
export function joinIdentities(names: string[], locale: Locale): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return locale === "de" ? "die Agentin" : "the Agent";
  if (clean.length === 1) return clean[0]!;
  const last = clean[clean.length - 1]!;
  return `${clean.slice(0, -1).join(", ")} & ${last}`;
}

/** Vorlage mit den Werten eines Eintrags füllen. Unbekannte Platzhalter bleiben. */
export function renderShareText(template: string, vars: ShareVars, locale: Locale): string {
  const map: Record<string, string> = {
    title: vars.title,
    url: vars.url,
    identities: joinIdentities(vars.identities, locale),
    city: vars.city ?? "",
    date: vars.date ?? "",
  };
  return template
    .replace(/\{(\w+)\}/g, (m, key: string) => {
      const v = map[key];
      return v !== undefined ? v : m;
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .trim();
}

/** Öffentlicher Pfad eines Eintrags für den Teilen-Link (Briefings ohne Slug). */
export function sharePublicPath(type: ShareType, locale: Locale, slug: string | null): string {
  switch (type) {
    case "mission":
      return slug ? `/${locale}/einsaetze/${slug}` : `/${locale}/einsaetze`;
    case "dispatch":
      return slug ? `/${locale}/depeschen/${slug}` : `/${locale}/depeschen`;
    case "briefing":
      return `/${locale}/briefings`;
  }
}

// GitHub und YouTube sind bewusst vom Teilen ausgenommen.
const SHARE_EXCLUDED = new Set(["github", "youtube"]);

/** Gepflegte, teilbare Profile (nicht leer, ohne GitHub/YouTube). */
export function shareableProfiles(social: Record<string, string>): { key: string; url: string }[] {
  return Object.entries(social)
    .filter(([key, url]) => Boolean(url && url.trim()) && !SHARE_EXCLUDED.has(key))
    .map(([key, url]) => ({ key, url }));
}
