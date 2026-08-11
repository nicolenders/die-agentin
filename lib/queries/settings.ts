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
