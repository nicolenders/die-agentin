import { db } from "@/lib/db";
import { cachedQuery } from "@/lib/cache";

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
