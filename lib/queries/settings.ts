import { db } from "@/lib/db";
import { cachedQuery } from "@/lib/cache";
import type { Locale } from "@/lib/i18n/config";
import { SHARE_TYPES, type ShareType, shareTemplateKey, DEFAULT_SHARE_TEMPLATES, shareableProfiles } from "@/lib/share";
import {
  EMPTY_SLIDE_TEMPLATES,
  slideTemplateKeys,
  type SlideTemplateSet,
} from "@/lib/slide-templates";
import { locales } from "@/lib/i18n/config";
import {
  DEFAULT_REMINDER_EMAIL,
  DEFAULT_REMINDER_LEAD_DAYS,
  REMINDER_EMAIL_KEY,
  REMINDER_ENABLED_KEY,
  REMINDER_LEAD_DAYS_KEY,
  parseLeadDays,
} from "@/lib/dispatches/reminder";

// Seiteneinstellungen als Schlüssel/Wert. Aktuell die Social-Media-Profile im
// Footer — von Nicole in den Einstellungen pflegbar, ohne Deployment.

export interface SocialPlatform {
  key: string;
  label: string;
  icon: string; // Kürzel im Footer (keine externen Icon-Fonts)
  placeholder: string;
}

// LinkedIn ist der bevorzugte Kontaktweg (SPEC §12). Reihenfolge = Anzeige.
export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: "linkedin", label: "LinkedIn", icon: "in", placeholder: "https://www.linkedin.com/in/…" },
  { key: "instagram", label: "Instagram", icon: "ig", placeholder: "https://www.instagram.com/…" },
  { key: "facebook", label: "Facebook", icon: "fb", placeholder: "https://www.facebook.com/…" },
  { key: "youtube", label: "YouTube", icon: "yt", placeholder: "https://www.youtube.com/@…" },
  { key: "x", label: "X", icon: "x", placeholder: "https://x.com/…" },
  { key: "github", label: "GitHub", icon: "gh", placeholder: "https://github.com/…" },
];

export const SITE_SETTINGS_TAG = "site-settings";

export const socialSettingKey = (platform: string) => `social.${platform}`;

// Kontaktangaben (Phase 7.1): E-Mail und ladungsfähige Anschrift. An EINER
// Stelle gepflegt; auch das Impressum (Phase 11) liest sie hier aus.
export const CONTACT_EMAIL_KEY = "contact.email";
export const CONTACT_ADDRESS_KEY = "contact.postalAddress";

export interface ContactInfo {
  email: string;
  postalAddress: string;
}

async function fetchContactInfo(): Promise<ContactInfo> {
  const rows = await db.siteSetting.findMany({
    where: { key: { in: [CONTACT_EMAIL_KEY, CONTACT_ADDRESS_KEY] } },
    select: { key: true, value: true },
  });
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value.trim();
  return { email: map[CONTACT_EMAIL_KEY] ?? "", postalAddress: map[CONTACT_ADDRESS_KEY] ?? "" };
}

const loadContactInfo = cachedQuery(fetchContactInfo, ["site-settings", "contact"], [SITE_SETTINGS_TAG]);

export async function getContactInfo(): Promise<ContactInfo> {
  try {
    return await loadContactInfo();
  } catch {
    return { email: "", postalAddress: "" };
  }
}

// Erinnerung an nahende Veröffentlichungsdaten von Depeschen (SiteSettings).
// Vorlaufzeit und Empfängeradresse sind in den Einstellungen pflegbar; ohne
// Pflege gelten die Standardwerte aus lib/dispatches/reminder.
export interface ReminderSettings {
  enabled: boolean;
  leadDays: number;
  email: string;
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  const keys = [REMINDER_ENABLED_KEY, REMINDER_LEAD_DAYS_KEY, REMINDER_EMAIL_KEY];
  try {
    const rows = await db.siteSetting.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } });
    const map = new Map(rows.map((r) => [r.key, r.value.trim()]));
    const enabledRaw = map.get(REMINDER_ENABLED_KEY);
    return {
      // Ohne Eintrag ist die Erinnerung an: sie ist der Zweck der Funktion.
      enabled: enabledRaw == null ? true : enabledRaw === "true",
      leadDays: parseLeadDays(map.get(REMINDER_LEAD_DAYS_KEY)),
      email: map.get(REMINDER_EMAIL_KEY) || DEFAULT_REMINDER_EMAIL,
    };
  } catch {
    return { enabled: true, leadDays: DEFAULT_REMINDER_LEAD_DAYS, email: DEFAULT_REMINDER_EMAIL };
  }
}

// Speaker-Kit-Bios (Anhang A): drei Längen je Sprache, als SiteSettings gepflegt.
export interface Bios {
  short: string;
  medium: string;
  long: string;
}

async function fetchBios(locale: string): Promise<Bios> {
  const keys = ["short", "medium", "long"].map((l) => `bio.${l}.${locale}`);
  const rows = await db.siteSetting.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } });
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return {
    short: map[`bio.short.${locale}`] ?? "",
    medium: map[`bio.medium.${locale}`] ?? "",
    long: map[`bio.long.${locale}`] ?? "",
  };
}

export async function getBios(locale: string): Promise<Bios> {
  const run = cachedQuery(fetchBios, ["site-settings", "bios", locale], [SITE_SETTINGS_TAG]);
  try {
    return await run(locale);
  } catch {
    return { short: "", medium: "", long: "" };
  }
}

/**
 * Bereinigt eine eingegebene Profil-URL: leert bei Leereingabe (Link wird
 * entfernt) und ergänzt ein fehlendes Schema um `https://`, damit der Footer
 * keine relativen/kaputten Links erzeugt.
 */
export function normalizeSocialUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

async function fetchSocialLinks(): Promise<Record<string, string>> {
  const keys = SOCIAL_PLATFORMS.map((p) => socialSettingKey(p.key));
  const rows = await db.siteSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  });
  const map: Record<string, string> = {};
  for (const row of rows) {
    const platform = row.key.replace(/^social\./, "");
    const value = row.value.trim();
    if (value) map[platform] = value;
  }
  return map;
}

// Gecacht: ein Footer-Aufruf (jede Seite) berührt so die DB nicht (SPEC §2.1).
// Wird beim Speichern über den Tag `site-settings` invalidiert.
const loadSocialLinks = cachedQuery(
  fetchSocialLinks,
  ["site-settings", "social"],
  [SITE_SETTINGS_TAG],
);

/**
 * Footer-Social-Links. Fehlertolerant: Der Footer steckt im geteilten Layout
 * (auch der statisch gerenderten Startseite). Ist die DB nicht erreichbar —
 * etwa beim Docker-Build ohne Datenbank oder während die Serverless-Instanz
 * pausiert —, liefert die Abfrage einfach keine Links, statt die Seite scheitern
 * zu lassen.
 */
export async function getSocialLinks(): Promise<Record<string, string>> {
  try {
    return await loadSocialLinks();
  } catch {
    return {};
  }
}

/**
 * Foliensvorlagen je Sprache (PowerPoint). Nur im Adminbereich gelesen —
 * deshalb ungecacht, damit eine frisch hochgeladene Vorlage sofort erscheint.
 * Ist die Datenbank nicht erreichbar, bleibt das Formular bedienbar und zeigt
 * schlicht keine Vorlage an.
 */
export async function getSlideTemplates(): Promise<SlideTemplateSet> {
  const result: SlideTemplateSet = { ...EMPTY_SLIDE_TEMPLATES };
  const keys = locales.flatMap((l) => Object.values(slideTemplateKeys(l)));
  try {
    const rows = await db.siteSetting.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } });
    const map = new Map(rows.map((r) => [r.key, r.value.trim()]));
    for (const locale of locales) {
      const { path, name, bytes } = slideTemplateKeys(locale);
      const storedPath = map.get(path);
      if (!storedPath) continue;
      result[locale] = {
        locale,
        path: storedPath,
        fileName: map.get(name) || "vorlage.pptx",
        bytes: Number(map.get(bytes) ?? 0) || 0,
      };
    }
  } catch {
    // ohne Vorlagen weiter
  }
  return result;
}

export interface ShareProfile {
  key: string;
  label: string;
  icon: string;
  url: string;
}

// Teilbare Profile mit Anzeige-Metadaten (Label, Icon-Kürzel) für das Teilen-
// Popup. GitHub/YouTube und leere Profile sind bereits ausgenommen.
export async function getShareProfiles(): Promise<ShareProfile[]> {
  const social = await getSocialLinks();
  const meta = new Map(SOCIAL_PLATFORMS.map((p) => [p.key, p]));
  return shareableProfiles(social).map(({ key, url }) => ({
    key,
    url,
    label: meta.get(key)?.label ?? key,
    icon: meta.get(key)?.icon ?? key,
  }));
}

// Teilen-Vorlagen je Typ und Sprache. Gepflegte Werte überschreiben die
// Standardtexte; fehlt etwas oder ist die DB nicht erreichbar, greifen die
// Standardtexte aus lib/share. Admin-Nutzung → nicht gecacht.
export async function getShareTemplates(): Promise<Record<ShareType, Record<Locale, string>>> {
  const result = {} as Record<ShareType, Record<Locale, string>>;
  for (const type of SHARE_TYPES) {
    result[type] = { de: DEFAULT_SHARE_TEMPLATES[type].de, en: DEFAULT_SHARE_TEMPLATES[type].en };
  }
  const keys = SHARE_TYPES.flatMap((t) => [shareTemplateKey(t, "de"), shareTemplateKey(t, "en")]);
  try {
    const rows = await db.siteSetting.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    for (const type of SHARE_TYPES) {
      for (const locale of ["de", "en"] as Locale[]) {
        const v = map.get(shareTemplateKey(type, locale));
        if (v && v.trim()) result[type][locale] = v;
      }
    }
  } catch {
    // Standardtexte
  }
  return result;
}
