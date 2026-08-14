import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { normalizePath } from "@/lib/analytics/path";

export { normalizePath } from "@/lib/analytics/path";

// geoip-lite lädt beim ersten Zugriff ~150 MB Daten. Erst zur Laufzeit und nur
// einmal je Prozess laden (nicht beim Modul-Import, damit der Build nicht darüber
// stolpert). Fehlt das Paket/die Daten, fällt die Länder-Zuordnung auf „XX".
let geoipLookup: ((ip: string) => { country?: string } | null) | null = null;
async function lookupCountry(ip: string | null): Promise<string> {
  if (!ip) return "XX";
  try {
    if (!geoipLookup) {
      const mod = (await import("geoip-lite")) as unknown as {
        default?: { lookup: (ip: string) => { country?: string } | null };
        lookup?: (ip: string) => { country?: string } | null;
      };
      const fn = mod.default?.lookup ?? mod.lookup;
      if (!fn) return "XX";
      geoipLookup = fn;
    }
    return geoipLookup(ip)?.country ?? "XX";
  } catch {
    return "XX";
  }
}

// Datensparsame, first-party Reichweiten-Erfassung (kein Drittanbieter, keine
// Cookies, keine gespeicherte IP). Aus IP + tagesbezogenem Salt entsteht ein
// nicht umkehrbarer Besucher-Hash für eine ungefähre Unique-Zählung; die IP
// selbst wird nur transient zur groben Länder-Zuordnung genutzt und verworfen.

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|slackbot|vkshare|whatsapp|flipboard|tumblr|redditbot|headless|lighthouse|monitoring|uptime|curl|wget|python-requests/i;

function clientIp(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? h.get("x-client-ip") ?? null;
}

function salt(): string {
  return process.env.ANALYTICS_SALT ?? "die-agentin-reach-v1";
}

export async function recordPageview(opts: { rawPath: string; headers: Headers }): Promise<void> {
  const ua = opts.headers.get("user-agent") ?? "";
  if (!ua || BOT_RE.test(ua)) return;
  // Do Not Track / Global Privacy Control respektieren.
  if (opts.headers.get("dnt") === "1" || opts.headers.get("sec-gpc") === "1") return;

  const norm = normalizePath(opts.rawPath);
  if (!norm) return;

  const ip = clientIp(opts.headers);
  const country = await lookupCountry(ip);
  const now = new Date();
  const dayStr = now.toISOString().slice(0, 10); // UTC-Tag
  const day = new Date(`${dayStr}T00:00:00.000Z`);
  const visitorHash = createHash("sha256")
    .update(`${salt()}|${ip ?? "unknown"}|${dayStr}`)
    .digest("hex");

  try {
    await db.pageview.create({
      data: {
        day,
        path: norm.path,
        locale: norm.locale,
        section: norm.section,
        country: country.slice(0, 2).toUpperCase() || "XX",
        visitorHash,
      },
    });
  } catch {
    // Zählung ist „best effort" — ein DB-Fehler darf den Seitenaufruf nie stören.
  }
}
